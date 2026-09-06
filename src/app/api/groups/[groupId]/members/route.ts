import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canManageRole, canAssignRole, isGroupRole } from "@/lib/groups/roles";
import { getGroupMembership } from "@/lib/groups/membership";
import { updateMemberRoleSchema, userIdSchema } from "@/lib/validation/groups";
import { z } from "zod";

const groupIdSchema = z.string().uuid();

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await requireUser();
  const { groupId: rawGroupId } = await params;
  const groupId = groupIdSchema.parse(rawGroupId);
  const [group] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
  if (!(await getGroupMembership(user.id, groupId))) return Response.json({ error: "Not a group member" }, { status: 403 });
  const members = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")));
  return Response.json({ members });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId: rawGroupId } = await params;
    const groupId = groupIdSchema.parse(rawGroupId);
    const body = updateMemberRoleSchema.parse(await request.json());
    const actor = await getGroupMembership(user.id, groupId);
    const target = await getGroupMembership(body.userId, groupId);
    const [group] = await db.select({ status: groups.status, ownerId: groups.ownerId }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    if (!actor || !target || target.status !== "active") return Response.json({ error: "Active membership not found" }, { status: 404 });
    if (!isGroupRole(body.role) || !canManageRole(actor.role, target.role) || !canAssignRole(actor.role, body.role)) return Response.json({ error: "You cannot change this member's role" }, { status: 403 });
    if (target.userId === group.ownerId || target.role === "owner") return Response.json({ error: "The owner cannot be demoted" }, { status: 403 });
    if (body.role === "owner") return Response.json({ error: "Use ownership transfer to change the owner" }, { status: 400 });
    const [updated] = await db.update(groupMembers).set({ role: body.role, updatedAt: new Date() }).where(and(eq(groupMembers.id, target.id), eq(groupMembers.status, "active"), eq(groupMembers.role, target.role))).returning();
    return updated ? Response.json({ success: true, member: updated }) : Response.json({ error: "Member role changed; please refresh" }, { status: 409 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId: rawGroupId } = await params;
    const groupId = groupIdSchema.parse(rawGroupId);
    const targetUserId = userIdSchema.parse((await request.json()).userId);
    const [group] = await db.select({ status: groups.status, ownerId: groups.ownerId }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    const actor = await getGroupMembership(user.id, groupId);
    const target = await getGroupMembership(targetUserId, groupId);
    if (!actor || !target || target.status !== "active") return Response.json({ error: "Active membership not found" }, { status: 404 });
    if (target.userId === group.ownerId || target.role === "owner") return Response.json({ error: "The owner cannot be removed" }, { status: 403 });
    if (!canManageRole(actor.role, target.role)) return Response.json({ error: "You cannot remove this member" }, { status: 403 });
    const [removed] = await db.update(groupMembers).set({ status: "removed", updatedAt: new Date() }).where(and(eq(groupMembers.id, target.id), eq(groupMembers.status, "active"))).returning();
    return removed ? Response.json({ success: true }) : Response.json({ error: "Member was already removed" }, { status: 409 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
