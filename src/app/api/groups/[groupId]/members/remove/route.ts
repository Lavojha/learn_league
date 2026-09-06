import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getGroupMembership } from "@/lib/groups/membership";
import { canManageRole } from "@/lib/groups/roles";
import { userIdSchema } from "@/lib/validation/groups";

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId } = await params;
    const targetUserId = userIdSchema.parse((await request.json()).userId);
    const actor = await getGroupMembership(user.id, groupId);
    const target = await getGroupMembership(targetUserId, groupId);
    if (!actor || !target) return Response.json({ error: "Membership not found" }, { status: 404 });
    if (!canManageRole(actor.role, target.role)) return Response.json({ error: "You cannot remove this member" }, { status: 403 });
    await db.update(groupMembers).set({ status: "removed", updatedAt: new Date() }).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
