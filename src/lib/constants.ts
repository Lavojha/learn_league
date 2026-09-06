export const APP_NAME = "Learn League";

export const SUPPORTED_MATERIAL_MIME_TYPES = ["application/pdf"] as const;

export const MATERIAL_ACCESS_DURATION_OPTIONS = [15, 30, 60, 120] as const;

export const MAX_MATERIAL_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const GROUP_ROLES = {
  OWNER: "owner",
  CO_OWNER: "co_owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;
