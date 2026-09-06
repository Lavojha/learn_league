import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { normalizeInviteCode } from "@/lib/utils/strings";
import { randomBytes } from "node:crypto";

const groupIdSchema = z.string().uuid();

function generateInviteCode() {
  return randomBytes(8).toString("hex").toUpperCase();
}

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    if (!(await hasGroupPermission(user.id, groupId, "manageInvitations"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const [group] = await db.select({ inviteCode: groups.inviteCode, type: groups.type, status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    return Response.json({ inviteCode: group.type === "private" ? group.inviteCode : null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load invite code" }, { status: 400 });
  }
}

export async function POST(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    if (!(await hasGroupPermission(user.id, groupId, "manageInvitations"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const [current] = await db.select({ type: groups.type, status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!current || current.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    if (current.type !== "private") return Response.json({ error: "Invite codes are only used for private groups" }, { status: 400 });

    let code = normalizeInviteCode(generateInviteCode());
    for (let attempt = 0; attempt < 5; attempt++) {
      const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.inviteCode, code)).limit(1);
      if (!existing) break;
      code = normalizeInviteCode(generateInviteCode());
    }
    const [group] = await db.update(groups).set({ inviteCode: code, updatedAt: new Date() }).where(and(eq(groups.id, groupId), eq(groups.status, "active"))).returning({ inviteCode: groups.inviteCode });
    return group ? Response.json({ success: true, inviteCode: group.inviteCode }) : Response.json({ error: "Group not found" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate invite code" }, { status: 400 });
  }
}
