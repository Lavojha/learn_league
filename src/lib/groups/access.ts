import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { getGroupMembership } from "@/lib/groups/membership";
import { hasGroupPermission, type GroupPermission } from "@/lib/groups/permissions";

export async function getGroup(groupId: string) {
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  return group ?? null;
}

export async function canAccessGroup(userId: string, groupId: string) {
  const group = await getGroup(groupId);
  if (!group || group.status !== "active") return false;

  if (group.type === "public" && group.visibility === "discoverable") return true;

  return (await getGroupMembership(userId, groupId)) !== null;
}

export async function requireGroupMember(userId: string, groupId: string) {
  const membership = await getGroupMembership(userId, groupId);
  if (!membership) {
    throw new Error("You are not an active member of this group");
  }
  return membership;
}

export async function requireGroupPermission(
  userId: string,
  groupId: string,
  permission: GroupPermission,
) {
  const allowed = await hasGroupPermission(userId, groupId, permission);
  if (!allowed) {
    throw new Error("You do not have permission for this action");
  }
}
