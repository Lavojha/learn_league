import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupJoinRequests, groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { normalizeInviteCode } from "@/lib/utils/strings";
import { joinGroupSchema } from "@/lib/validation/groups";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = joinGroupSchema.parse(await request.json());
    let group;
    if (body.inviteCode) {
      [group] = await db.select().from(groups).where(eq(groups.inviteCode, normalizeInviteCode(body.inviteCode))).limit(1);
    } else {
      [group] = await db.select().from(groups).where(eq(groups.id, body.groupId!)).limit(1);
    }
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });

    const [existing] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id))).limit(1);
    if (existing?.status === "active") return Response.json({ success: true, status: "already_member" });

    if (body.inviteCode) {
      if (!group.inviteCode) return Response.json({ error: "This group does not have an invite code" }, { status: 403 });
      if (existing?.status === "removed") {
        await db.update(groupMembers).set({ status: "active", role: "member", joinedAt: new Date(), updatedAt: new Date() }).where(eq(groupMembers.id, existing.id));
        return Response.json({ success: true, status: "joined" });
      }
      const [member] = await db.insert(groupMembers).values({ groupId: group.id, userId: user.id, role: "member" }).onConflictDoNothing().returning();
      return Response.json({ success: true, status: member ? "joined" : "already_member" });
    }

    if (group.type === "public") {
      if (group.visibility !== "discoverable") return Response.json({ error: "Public groups must be discoverable" }, { status: 403 });
      if (existing?.status === "removed") {
        await db.update(groupMembers).set({ status: "active", role: "member", joinedAt: new Date(), updatedAt: new Date() }).where(eq(groupMembers.id, existing.id));
        return Response.json({ success: true, status: "joined" });
      }
      const [member] = await db.insert(groupMembers).values({ groupId: group.id, userId: user.id, role: "member" }).onConflictDoNothing().returning();
      return Response.json({ success: true, status: member ? "joined" : "already_member" });
    }

    if (group.visibility === "hidden") return Response.json({ error: "This private group requires an invitation or invite code" }, { status: 403 });
    const [pending] = await db.select().from(groupJoinRequests).where(and(eq(groupJoinRequests.groupId, group.id), eq(groupJoinRequests.userId, user.id), eq(groupJoinRequests.status, "pending"))).limit(1);
    if (pending) return Response.json({ success: true, status: "request_pending" });
    const [requestRow] = await db.insert(groupJoinRequests).values({ groupId: group.id, userId: user.id, status: "pending" }).returning();
    return Response.json({ success: true, status: "request_pending", request: requestRow });
  } catch (error) {
    console.error("Join group failed:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
