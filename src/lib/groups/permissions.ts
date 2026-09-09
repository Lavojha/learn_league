import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupPermissions, groups } from "@/db/schema";
import { getGroupMembership } from "@/lib/groups/membership";
import type { GroupRole } from "@/lib/groups/roles";

export type GroupPermission = "manageMembers" | "manageMaterials" | "manageGroupInfo" | "manageInvitations" | "manageJoinRequests" | "manageContent";

const rolePermissionDefaults: Record<GroupRole, Record<GroupPermission, boolean>> = {
  owner: { manageMembers: true, manageMaterials: true, manageGroupInfo: true, manageInvitations: true, manageJoinRequests: true, manageContent: true },
  co_owner: { manageMembers: true, manageMaterials: true, manageGroupInfo: true, manageInvitations: true, manageJoinRequests: true, manageContent: true },
  admin: { manageMembers: true, manageMaterials: true, manageGroupInfo: false, manageInvitations: true, manageJoinRequests: true, manageContent: true },
  member: { manageMembers: false, manageMaterials: false, manageGroupInfo: false, manageInvitations: false, manageJoinRequests: false, manageContent: false },
};

const columnByPermission: Record<GroupPermission, keyof typeof groupPermissions.$inferSelect> = {
  manageMembers: "manageMembers", manageMaterials: "manageMaterials", manageGroupInfo: "manageGroupInfo", manageInvitations: "manageInvitations", manageJoinRequests: "manageJoinRequests", manageContent: "manageContent",
};

export async function getRolePermissions(groupId: string, role: GroupRole) {
  const [stored] = await db.select().from(groupPermissions).where(and(eq(groupPermissions.groupId, groupId), eq(groupPermissions.role, role))).limit(1);
  return stored ?? { ...rolePermissionDefaults[role], role };
}

export async function hasGroupPermission(userId: string, groupId: string, permission: GroupPermission) {
  const [group] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group || group.status !== "active") return false;
  const membership = await getGroupMembership(userId, groupId);
  if (!membership || membership.status !== "active") return false;
  if (membership.role === "owner") return true;
  const permissions = await getRolePermissions(groupId, membership.role);
  return Boolean(permissions[columnByPermission[permission]]);
}

export function getDefaultRolePermissions(role: GroupRole) {
  return rolePermissionDefaults[role];
}
