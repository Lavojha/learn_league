import type { GroupRole } from "@/lib/groups/roles";

export type { GroupRole };

export type GroupType = "public" | "private";
export type GroupVisibility = "discoverable" | "hidden";
export type GroupStatus = "active" | "archived";

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  type: GroupType;
  visibility: GroupVisibility;
  status: GroupStatus;
  ownerId: string;
  createdAt: Date;
}

export interface GroupMemberSummary {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  status: "active" | "removed";
  joinedAt: Date;
}
