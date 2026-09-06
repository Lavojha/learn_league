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
    const body = await request.json();
    const newOwnerId = userIdSchema.parse(body.newOwnerId);
    const actor = await getGroupMembership(user.id, groupId);
    const target = await getGroupMembership(newOwnerId, groupId);
    if (!actor || actor.role !== "owner") return Response.json({ error: "Only the owner can transfer ownership" }, { status: 403 });
    if (!target || target.role === "owner") return Response.json({ error: "New owner must be an existing co-owner or admin" }, { status: 400 });

    await db.update(groups).set({ ownerId: newOwnerId, updatedAt: new Date() }).where(eq(groups.id, groupId));
    await db.update(groupMembers).set({ role: "co_owner", updatedAt: new Date() }).where(eq(groupMembers.id, actor.id));
    await db.update(groupMembers).set({ role: "owner", updatedAt: new Date() }).where(eq(groupMembers.id, target.id));

    return Response.json({ success: true, ownerId: newOwnerId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
