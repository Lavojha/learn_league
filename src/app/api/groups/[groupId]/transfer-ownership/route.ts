import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getGroupMembership } from "@/lib/groups/membership";
import { userIdSchema } from "@/lib/validation/groups";

const groupIdSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const newOwnerId = userIdSchema.parse((await request.json()).newOwnerId);
    const actor = await getGroupMembership(user.id, groupId);
    const target = await getGroupMembership(newOwnerId, groupId);
    if (!actor || actor.role !== "owner") return Response.json({ error: "Only the owner can transfer ownership" }, { status: 403 });
    if (!target || target.status !== "active" || (target.role !== "co_owner" && target.role !== "admin")) return Response.json({ error: "New owner must be an existing active co-owner or admin" }, { status: 400 });
    if (newOwnerId === user.id) return Response.json({ error: "You are already the owner" }, { status: 400 });

    const now = new Date();
    await db.transaction(async (tx) => {
      const [group] = await tx.select({ ownerId: groups.ownerId, status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
      if (!group || group.status !== "active" || group.ownerId !== user.id) throw new Error("Group ownership changed; please refresh and try again");
      const [currentTarget] = await tx.select({ id: groupMembers.id, role: groupMembers.role, status: groupMembers.status }).from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, newOwnerId))).limit(1);
      if (!currentTarget || currentTarget.status !== "active" || (currentTarget.role !== "co_owner" && currentTarget.role !== "admin")) throw new Error("Target is no longer eligible for ownership");
      await tx.update(groups).set({ ownerId: newOwnerId, updatedAt: now }).where(and(eq(groups.id, groupId), eq(groups.ownerId, user.id)));
      await tx.update(groupMembers).set({ role: "co_owner", updatedAt: now }).where(and(eq(groupMembers.id, actor.id), eq(groupMembers.role, "owner")));
      await tx.update(groupMembers).set({ role: "owner", updatedAt: now }).where(and(eq(groupMembers.id, currentTarget.id), eq(groupMembers.role, currentTarget.role)));
    });

    return Response.json({ success: true, ownerId: newOwnerId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to transfer ownership" }, { status: 400 });
  }
}
