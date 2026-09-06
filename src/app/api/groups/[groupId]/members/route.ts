import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canManageRole, canAssignRole, isGroupRole } from "@/lib/groups/roles";
import { getGroupMembership } from "@/lib/groups/membership";
import { updateMemberRoleSchema } from "@/lib/validation/groups";

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await requireUser();
  const { groupId } = await params;
  const actor = await getGroupMembership(user.id, groupId);
  if (!actor) return Response.json({ error: "Not a group member" }, { status: 403 });

  const members = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")));
  return Response.json({ members });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId } = await params;
    const body = updateMemberRoleSchema.parse(await request.json());
    const actor = await getGroupMembership(user.id, groupId);
    const target = await getGroupMembership(body.userId, groupId);

    if (!actor || !target) return Response.json({ error: "Membership not found" }, { status: 404 });
    if (!canManageRole(actor.role, target.role) || !canAssignRole(actor.role, body.role) || !isGroupRole(body.role)) {
      return Response.json({ error: "You cannot change this member's role" }, { status: 403 });
    }

    const [updated] = await db.update(groupMembers).set({ role: body.role, updatedAt: new Date() }).where(eq(groupMembers.id, target.id)).returning();
    return Response.json({ success: true, member: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
