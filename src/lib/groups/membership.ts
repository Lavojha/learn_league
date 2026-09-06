import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import type { GroupRole } from "@/lib/groups/roles";

export async function getGroupMembership(userId: string, groupId: string) {
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.userId, userId),
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.status, "active"),
      ),
    )
    .limit(1);

  return membership ?? null;
}

export async function getGroupRole(userId: string, groupId: string): Promise<GroupRole | null> {
  const membership = await getGroupMembership(userId, groupId);
  return membership?.role ?? null;
}

export async function isGroupMember(userId: string, groupId: string) {
  return (await getGroupMembership(userId, groupId)) !== null;
}
