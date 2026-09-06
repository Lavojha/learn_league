import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupInvitations, groupMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { respondInvitationSchema } from "@/lib/validation/groups";

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId } = await params;
    const body = await request.json();

    if (body.action) {
      const parsed = respondInvitationSchema.parse(body);
      const [invitation] = await db.select().from(groupInvitations).where(and(eq(groupInvitations.id, parsed.invitationId), eq(groupInvitations.invitedUserId, user.id), eq(groupInvitations.groupId, groupId), eq(groupInvitations.status, "pending"))).limit(1);
      if (!invitation) return Response.json({ error: "Invitation not found" }, { status: 404 });
      if (invitation.expiresAt && invitation.expiresAt <= new Date()) {
        await db.update(groupInvitations).set({ status: "expired", respondedAt: new Date() }).where(eq(groupInvitations.id, invitation.id));
        return Response.json({ error: "Invitation has expired" }, { status: 410 });
      }
      if (parsed.action === "decline") {
        const [updated] = await db.update(groupInvitations).set({ status: "declined", respondedAt: new Date() }).where(eq(groupInvitations.id, invitation.id)).returning();
        return Response.json({ success: true, invitation: updated });
      }
      const [existing] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id))).limit(1);
      const member = existing?.status === "removed"
        ? (await db.update(groupMembers).set({ status: "active", role: "member", joinedAt: new Date(), updatedAt: new Date() }).where(eq(groupMembers.id, existing.id)).returning())[0]
        : existing ?? (await db.insert(groupMembers).values({ groupId, userId: user.id, role: "member" }).returning())[0];
      const [updated] = await db.update(groupInvitations).set({ status: "accepted", respondedAt: new Date() }).where(eq(groupInvitations.id, invitation.id)).returning();
      return Response.json({ success: true, invitation: updated, member });
    }

    if (!(await hasGroupPermission(user.id, groupId, "manageInvitations"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const invitedUserId = String(body.invitedUserId ?? "");
    if (!invitedUserId) return Response.json({ error: "invitedUserId is required" }, { status: 400 });
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return Response.json({ error: "Invalid expiresAt" }, { status: 400 });
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
