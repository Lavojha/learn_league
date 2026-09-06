export const GROUP_ROLES = ["owner", "co_owner", "admin", "member"] as const;

export type GroupRole = (typeof GROUP_ROLES)[number];

export const ROLE_LEVEL: Record<GroupRole, number> = {
  owner: 4,
  co_owner: 3,
  admin: 2,
  member: 1,
};

export function isGroupRole(value: string): value is GroupRole {
  return (GROUP_ROLES as readonly string[]).includes(value);
}

export function isAtLeastRole(role: GroupRole, minimumRole: GroupRole) {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimumRole];
}

export function canManageRole(actorRole: GroupRole, targetRole: GroupRole) {
  if (actorRole === "owner") return targetRole !== "owner";
  if (actorRole === "co_owner") return targetRole === "admin" || targetRole === "member";
  if (actorRole === "admin") return targetRole === "member";
  return false;
}

export function canAssignRole(actorRole: GroupRole, newRole: GroupRole) {
  if (actorRole === "owner") return newRole !== "owner";
  if (actorRole === "co_owner") return newRole === "admin" || newRole === "member";
  if (actorRole === "admin") return newRole === "member";
  return false;
}
