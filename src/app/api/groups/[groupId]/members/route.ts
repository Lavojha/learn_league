import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getGroupMembership } from "@/lib/groups/membership";
import { canAssignRole, canManageRole, isGroupRole } from "@/lib/groups/roles";
import { updateMemberRoleSchema, userIdSchema } from "@/lib/validation/groups";

const groupIdSchema = z.string().uuid();

function memberResponse(member: typeof groupMembers.$inferSelect) {
  return {
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
    updatedAt: member.updatedAt,
  };
}

async function getActiveGroup(groupId: string) {
  const [group] = await db
    .select({ status: groups.status, ownerId: groups.ownerId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  return group?.status === "active" ? group : null;
}

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const group = await getActiveGroup(groupId);
    if (!group) return Response.json({ error: "Group not found" }, { status: 404 });
    if (!(await getGroupMembership(user.id, groupId))) {
      return Response.json({ error: "Not a group member" }, { status: 403 });
    }

    const members = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")));

    return Response.json({ members: members.map(memberResponse) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load members" },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const body = updateMemberRoleSchema.parse(await request.json());
    const group = await getActiveGroup(groupId);
    if (!group) return Response.json({ error: "Group not found" }, { status: 404 });

    const [actor, target] = await Promise.all([
      getGroupMembership(user.id, groupId),
      getGroupMembership(body.userId, groupId),
    ]);
    if (!actor || !target) {
      return Response.json({ error: "Active membership not found" }, { status: 404 });
    }
    if (target.userId === group.ownerId || target.role === "owner") {
      return Response.json({ error: "The owner cannot be demoted" }, { status: 403 });
    }
    if (
      !isGroupRole(body.role) ||
      !canManageRole(actor.role, target.role) ||
      !canAssignRole(actor.role, body.role)
    ) {
      return Response.json({ error: "You cannot change this member's role" }, { status: 403 });
    }
    if (body.role === "owner") {
      return Response.json({ error: "Use ownership transfer to change the owner" }, { status: 400 });
    }

    const [updated] = await db
      .update(groupMembers)
      .set({ role: body.role, updatedAt: new Date() })
      .where(
        and(
          eq(groupMembers.id, target.id),
          eq(groupMembers.status, "active"),
          eq(groupMembers.role, target.role),
        ),
      )
      .returning();

    return updated
      ? Response.json({ success: true, member: memberResponse(updated) })
      : Response.json({ error: "Member role changed; please refresh" }, { status: 409 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const body = await request.json();
    const targetUserId = userIdSchema.parse(body.userId);
    const group = await getActiveGroup(groupId);
    if (!group) return Response.json({ error: "Group not found" }, { status: 404 });

    const [actor, target] = await Promise.all([
      getGroupMembership(user.id, groupId),
      getGroupMembership(targetUserId, groupId),
    ]);
    if (!actor || !target) {
      return Response.json({ error: "Active membership not found" }, { status: 404 });
    }
    if (target.userId === group.ownerId || target.role === "owner") {
      return Response.json({ error: "The owner cannot be removed" }, { status: 403 });
    }
    if (!canManageRole(actor.role, target.role)) {
      return Response.json({ error: "You cannot remove this member" }, { status: 403 });
    }

    const [removed] = await db
      .update(groupMembers)
      .set({ status: "removed", updatedAt: new Date() })
      .where(and(eq(groupMembers.id, target.id), eq(groupMembers.status, "active")))
      .returning();

    return removed
      ? Response.json({ success: true })
      : Response.json({ error: "Member was already removed" }, { status: 409 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
