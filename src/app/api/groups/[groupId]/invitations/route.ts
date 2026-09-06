import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupInvitations, groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { respondInvitationSchema, userIdSchema } from "@/lib/validation/groups";

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId } = await params;
    const body = await request.json();

    if (body.action) {
      const parsed = respondInvitationSchema.parse(body);
      const [group] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
      if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
      const [invitation] = await db.select().from(groupInvitations).where(and(eq(groupInvitations.id, parsed.invitationId), eq(groupInvitations.invitedUserId, user.id), eq(groupInvitations.groupId, groupId), eq(groupInvitations.status, "pending"))).limit(1);
      if (!invitation) return Response.json({ error: "Invitation not found" }, { status: 404 });
      const now = new Date();
      if (invitation.expiresAt && invitation.expiresAt <= now) {
        await db.update(groupInvitations).set({ status: "expired", respondedAt: now }).where(eq(groupInvitations.id, invitation.id));
        return Response.json({ error: "Invitation has expired" }, { status: 410 });
      }
      if (parsed.action === "decline") {
        const [updated] = await db.update(groupInvitations).set({ status: "declined", respondedAt: now }).where(and(eq(groupInvitations.id, invitation.id), eq(groupInvitations.status, "pending"))).returning();
        return updated ? Response.json({ success: true, invitation: updated }) : Response.json({ error: "Invitation is no longer pending" }, { status: 409 });
      }
      const [existing] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id))).limit(1);
      const member = existing?.status === "removed"
        ? (await db.update(groupMembers).set({ status: "active", role: "member", joinedAt: now, updatedAt: now }).where(eq(groupMembers.id, existing.id)).returning())[0]
        : existing ?? (await db.insert(groupMembers).values({ groupId, userId: user.id, role: "member" }).onConflictDoNothing().returning())[0];
      if (!member) return Response.json({ error: "Unable to join group" }, { status: 409 });
      const [updated] = await db.update(groupInvitations).set({ status: "accepted", respondedAt: now }).where(and(eq(groupInvitations.id, invitation.id), eq(groupInvitations.status, "pending"))).returning();
      if (!updated) return Response.json({ error: "Invitation is no longer pending" }, { status: 409 });
      return Response.json({ success: true, invitation: updated, member });
    }

    if (!(await hasGroupPermission(user.id, groupId, "manageInvitations"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const [group] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    const invitedUserId = userIdSchema.parse(String(body.invitedUserId ?? ""));
    if (invitedUserId === user.id) return Response.json({ error: "You cannot invite yourself" }, { status: 400 });
    const [existingMember] = await db.select({ status: groupMembers.status }).from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, invitedUserId))).limit(1);
    if (existingMember?.status === "active") return Response.json({ error: "User is already a group member" }, { status: 409 });
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) return Response.json({ error: "expiresAt must be a future date" }, { status: 400 });
    const [pending] = await db.select({ id: groupInvitations.id }).from(groupInvitations).where(and(eq(groupInvitations.groupId, groupId), eq(groupInvitations.invitedUserId, invitedUserId), eq(groupInvitations.status, "pending"))).limit(1);
    if (pending) return Response.json({ error: "A pending invitation already exists" }, { status: 409 });
    const [invitation] = await db.insert(groupInvitations).values({ groupId, invitedUserId, invitedBy: user.id, expiresAt }).returning();
    return Response.json({ success: true, invitation });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await requireUser();
  const { groupId } = await params;
  const invitations = await db.select().from(groupInvitations).where(and(eq(groupInvitations.groupId, groupId), eq(groupInvitations.invitedUserId, user.id), eq(groupInvitations.status, "pending")));
  return Response.json({ invitations });
}
