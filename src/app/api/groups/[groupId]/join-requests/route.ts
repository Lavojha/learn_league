import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupJoinRequests, groupMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { reviewJoinRequestSchema } from "@/lib/validation/groups";

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!(await hasGroupPermission(user.id, groupId, "manageJoinRequests"))) return Response.json({ error: "Permission denied" }, { status: 403 });
  const requests = await db.select().from(groupJoinRequests).where(and(eq(groupJoinRequests.groupId, groupId), eq(groupJoinRequests.status, "pending")));
  return Response.json({ requests });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId } = await params;
    const body = reviewJoinRequestSchema.parse(await request.json());
    if (!(await hasGroupPermission(user.id, groupId, "manageJoinRequests"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const [joinRequest] = await db.select().from(groupJoinRequests).where(and(eq(groupJoinRequests.id, body.requestId), eq(groupJoinRequests.groupId, groupId), eq(groupJoinRequests.status, "pending"))).limit(1);
    if (!joinRequest) return Response.json({ error: "Request not found" }, { status: 404 });

    if (body.action === "approve") {
      const [existing] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, joinRequest.userId))).limit(1);
      if (existing?.status === "removed") {
        await db.update(groupMembers).set({ status: "active", role: "member", joinedAt: new Date(), updatedAt: new Date() }).where(eq(groupMembers.id, existing.id));
      } else if (!existing) {
        await db.insert(groupMembers).values({ groupId, userId: joinRequest.userId, role: "member" });
      }
    }
    const [updated] = await db.update(groupJoinRequests).set({ status: body.action === "approve" ? "approved" : "rejected", reviewedBy: user.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(groupJoinRequests.id, body.requestId)).returning();
    return Response.json({ success: true, request: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
