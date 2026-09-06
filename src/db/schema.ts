import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const groupRoleEnum = pgEnum("group_role", [
  "owner",
  "co_owner",
  "admin",
  "member",
]);

export const groupTypeEnum = pgEnum("group_type", ["public", "private"]);
export const groupVisibilityEnum = pgEnum("group_visibility", ["discoverable", "hidden"]);
export const groupStatusEnum = pgEnum("group_status", ["active", "archived"]);
export const memberStatusEnum = pgEnum("member_status", ["active", "removed"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "rejected", "cancelled"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "declined", "expired", "cancelled"]);
export const materialStatusEnum = pgEnum("material_status", ["draft", "published", "archived"]);
export const materialVisibilityEnum = pgEnum("material_visibility", ["private", "group", "public"]);
export const materialAvailabilityModeEnum = pgEnum("material_availability_mode", ["immediate", "scheduled"]);
export const materialExpiryActionEnum = pgEnum("material_expiry_action", ["remove_access", "enable_download", "archive"]);
export const materialDownloadStartModeEnum = pgEnum("material_download_start_mode", ["after_access", "scheduled"]);
export const accessSessionStatusEnum = pgEnum("access_session_status", ["active", "paused", "expired", "ended", "blocked"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: groupTypeEnum("type").default("private").notNull(),
  visibility: groupVisibilityEnum("visibility").default("hidden").notNull(),
  status: groupStatusEnum("status").default("active").notNull(),
  inviteCode: text("invite_code").unique(),
  ownerId: uuid("owner_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    role: groupRoleEnum("role").default("member").notNull(),
    status: memberStatusEnum("status").default("active").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ groupUserUnique: unique().on(table.groupId, table.userId) }),
);

export const groupPermissions = pgTable(
  "group_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    role: groupRoleEnum("role").notNull(),
    manageMembers: boolean("manage_members").default(false).notNull(),
    manageMaterials: boolean("manage_materials").default(false).notNull(),
    manageGroupInfo: boolean("manage_group_info").default(false).notNull(),
    manageInvitations: boolean("manage_invitations").default(false).notNull(),
    manageJoinRequests: boolean("manage_join_requests").default(false).notNull(),
    manageContent: boolean("manage_content").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ groupRoleUnique: unique().on(table.groupId, table.role) }),
);

export const groupInvitations = pgTable("group_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  invitedUserId: uuid("invited_user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  invitedBy: uuid("invited_by").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  status: invitationStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const groupJoinRequests = pgTable("group_join_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  status: requestStatusEnum("status").default("pending").notNull(),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const personalMaterials = pgTable("personal_materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  storageKey: text("storage_key").notNull(),
  originalFileName: text("original_file_name").notNull(),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const materials = pgTable("materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description"),
  storageKey: text("storage_key").notNull(),
  originalFileName: text("original_file_name").notNull(),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  status: materialStatusEnum("status").default("published").notNull(),
  visibility: materialVisibilityEnum("visibility").default("group").notNull(),
  availabilityMode: materialAvailabilityModeEnum("availability_mode").default("immediate").notNull(),
  availableFrom: timestamp("available_from", { withTimezone: true }),
  availableUntil: timestamp("available_until", { withTimezone: true }),
  accessDurationMinutes: integer("access_duration_minutes").default(30).notNull(),
  allowPause: boolean("allow_pause").default(false).notNull(),
  downloadEnabled: boolean("download_enabled").default(false).notNull(),
  downloadStartMode: materialDownloadStartModeEnum("download_start_mode"),
  downloadAvailableFrom: timestamp("download_available_from", { withTimezone: true }),
  downloadAvailableUntil: timestamp("download_available_until", { withTimezone: true }),
  expiryAction: materialExpiryActionEnum("expiry_action").default("remove_access").notNull(),
  publicAt: timestamp("public_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const materialTags = pgTable(
  "material_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => ({ materialTagUnique: unique().on(table.materialId, table.tag) }),
);

export const materialAccessSessions = pgTable("material_access_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  pausedSeconds: integer("paused_seconds").default(0).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: accessSessionStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const materialProgress = pgTable(
  "material_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    progressPercent: integer("progress_percent").default(0).notNull(),
    totalStudySeconds: integer("total_study_seconds").default(0).notNull(),
    completed: boolean("completed").default(false).notNull(),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ materialUserUnique: unique().on(table.materialId, table.userId) }),
);

export const personalStudySessions = pgTable("personal_study_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  personalMaterialId: uuid("personal_material_id").references(() => personalMaterials.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const personalTasks = pgTable("personal_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").default(false).notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
