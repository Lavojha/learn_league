import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getGroupMembership } from "@/lib/groups/membership";
import { userIdSchema } from "@/lib/validation/groups";

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId } = await params;
    const newOwnerId = userIdSchema.parse((await request.json()).newOwnerId);
    const actor = await getGroupMembership(user.id, groupId);
    const target = await getGroupMembership(newOwnerId, groupId);
    if (!actor || actor.role !== "owner") return Response.json({ error: "Only the owner can transfer ownership" }, { status: 403 });
    if (!target || (target.role !== "co_owner" && target.role !== "admin")) return Response.json({ error: "New owner must be an existing co-owner or admin" }, { status: 400 });

    await db.transaction(async (tx) => {
      await tx.update(groups).set({ ownerId: newOwnerId, updatedAt: new Date() }).where(eq(groups.id, groupId));
      await tx.update(groupMembers).set({ role: "co_owner", updatedAt: new Date() }).where(and(eq(groupMembers.id, actor.id), eq(groupMembers.role, "owner")));
      await tx.update(groupMembers).set({ role: "owner", updatedAt: new Date() }).where(and(eq(groupMembers.id, target.id), eq(groupMembers.role, target.role)));
    });

    return Response.json({ success: true, ownerId: newOwnerId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
