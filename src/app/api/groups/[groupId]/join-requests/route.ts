import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groupJoinRequests, groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { reviewJoinRequestSchema } from "@/lib/validation/groups";

const groupIdSchema = z.string().uuid();

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const [group] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    if (!(await hasGroupPermission(user.id, groupId, "manageJoinRequests"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const requests = await db.select().from(groupJoinRequests).where(and(eq(groupJoinRequests.groupId, groupId), eq(groupJoinRequests.status, "pending")));
    return Response.json({ requests });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load join requests" }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const body = reviewJoinRequestSchema.parse(await request.json());
    const [group] = await db.select({ status: groups.status, type: groups.type, visibility: groups.visibility }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    if (!(await hasGroupPermission(user.id, groupId, "manageJoinRequests"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    if (group.type !== "private" || group.visibility !== "discoverable") return Response.json({ error: "Join requests are only used for discoverable private groups" }, { status: 400 });

    const now = new Date();
    if (body.action === "reject") {
      const [updated] = await db.update(groupJoinRequests).set({ status: "rejected", reviewedBy: user.id, reviewedAt: now, updatedAt: now }).where(and(eq(groupJoinRequests.id, body.requestId), eq(groupJoinRequests.groupId, groupId), eq(groupJoinRequests.status, "pending"))).returning();
      return updated ? Response.json({ success: true, request: updated }) : Response.json({ error: "Request not found or already reviewed" }, { status: 409 });
    }

    const result = await db.transaction(async (tx) => {
      const [joinRequest] = await tx.select().from(groupJoinRequests).where(and(eq(groupJoinRequests.id, body.requestId), eq(groupJoinRequests.groupId, groupId), eq(groupJoinRequests.status, "pending"))).limit(1);
      if (!joinRequest) throw new Error("Request not found or already reviewed");
      const [existing] = await tx.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, joinRequest.userId))).limit(1);
      let member;
      if (existing?.status === "active") {
        member = existing;
      } else if (existing?.status === "removed") {
        [member] = await tx.update(groupMembers).set({ status: "active", role: "member", joinedAt: now, updatedAt: now }).where(eq(groupMembers.id, existing.id)).returning();
      } else {
        [member] = await tx.insert(groupMembers).values({ groupId, userId: joinRequest.userId, role: "member" }).onConflictDoNothing().returning();
      }
      if (!member) throw new Error("Unable to create membership");
      const [updated] = await tx.update(groupJoinRequests).set({ status: "approved", reviewedBy: user.id, reviewedAt: now, updatedAt: now }).where(and(eq(groupJoinRequests.id, body.requestId), eq(groupJoinRequests.status, "pending"))).returning();
      if (!updated) throw new Error("Request was already reviewed");
      return { request: updated, member };
    });
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
