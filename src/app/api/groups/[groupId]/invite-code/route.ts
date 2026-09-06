import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { normalizeInviteCode } from "@/lib/utils/strings";
import { randomBytes } from "node:crypto";

function generateInviteCode() {
  return randomBytes(8).toString("hex").toUpperCase();
}

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!(await hasGroupPermission(user.id, groupId, "manageInvitations"))) return Response.json({ error: "Permission denied" }, { status: 403 });
  const [group] = await db.select({ inviteCode: groups.inviteCode }).from(groups).where(eq(groups.id, groupId)).limit(1);
  return group ? Response.json({ inviteCode: group.inviteCode }) : Response.json({ error: "Group not found" }, { status: 404 });
}

export async function POST(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!(await hasGroupPermission(user.id, groupId, "manageInvitations"))) return Response.json({ error: "Permission denied" }, { status: 403 });
  let code = normalizeInviteCode(generateInviteCode());
  for (let attempt = 0; attempt < 5; attempt++) {
    const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.inviteCode, code)).limit(1);
    if (!existing) break;
    code = normalizeInviteCode(generateInviteCode());
  }
  const [group] = await db.update(groups).set({ inviteCode: code, updatedAt: new Date() }).where(eq(groups.id, groupId)).returning({ inviteCode: groups.inviteCode });
  return group ? Response.json({ success: true, inviteCode: group.inviteCode }) : Response.json({ error: "Group not found" }, { status: 404 });
}
