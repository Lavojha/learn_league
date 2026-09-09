import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groupInvitations, groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { respondInvitationSchema, userIdSchema } from "@/lib/validation/groups";

const groupIdSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const body = await request.json();

    if (body.action) {
      const parsed = respondInvitationSchema.parse(body);
      const [group] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
      if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
      const now = new Date();
      if (parsed.action === "decline") {
        const [updated] = await db.update(groupInvitations).set({ status: "declined", respondedAt: now }).where(and(eq(groupInvitations.id, parsed.invitationId), eq(groupInvitations.invitedUserId, user.id), eq(groupInvitations.groupId, groupId), eq(groupInvitations.status, "pending"))).returning();
        return updated ? Response.json({ success: true, invitation: updated }) : Response.json({ error: "Invitation not found or no longer pending" }, { status: 409 });
      }

      const result = await db.transaction(async (tx) => {
        const [invitation] = await tx.select().from(groupInvitations).where(and(eq(groupInvitations.id, parsed.invitationId), eq(groupInvitations.invitedUserId, user.id), eq(groupInvitations.groupId, groupId), eq(groupInvitations.status, "pending"))).limit(1);
        if (!invitation) throw new Error("Invitation not found or no longer pending");
        if (invitation.expiresAt && invitation.expiresAt <= now) {
          await tx.update(groupInvitations).set({ status: "expired", respondedAt: now }).where(and(eq(groupInvitations.id, invitation.id), eq(groupInvitations.status, "pending")));
          throw new Error("Invitation has expired");
        }
        const [existing] = await tx.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id))).limit(1);
        let member;
        if (existing?.status === "removed") {
          [member] = await tx.update(groupMembers).set({ status: "active", role: "member", joinedAt: now, updatedAt: now }).where(eq(groupMembers.id, existing.id)).returning();
        } else {
          member = existing ?? (await tx.insert(groupMembers).values({ groupId, userId: user.id, role: "member" }).onConflictDoNothing().returning())[0];
        }
        if (!member) throw new Error("Unable to join group");
        const [updated] = await tx.update(groupInvitations).set({ status: "accepted", respondedAt: now }).where(and(eq(groupInvitations.id, invitation.id), eq(groupInvitations.status, "pending"))).returning();
        if (!updated) throw new Error("Invitation was already handled");
        return { invitation: updated, member };
      });
      return Response.json({ success: true, ...result });
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
    const message = error instanceof Error ? error.message : "Invalid request";
    const status = message === "Invitation has expired" ? 410 : message.includes("not found or no longer pending") || message === "Invitation was already handled" ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const [group] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    const invitations = await db.select().from(groupInvitations).where(and(eq(groupInvitations.groupId, groupId), eq(groupInvitations.invitedUserId, user.id), eq(groupInvitations.status, "pending")));
    return Response.json({ invitations });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load invitations" }, { status: 400 });
  }
}
