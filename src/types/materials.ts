export type MaterialVisibility = "private" | "group" | "public";
export type MaterialStatus = "draft" | "published" | "archived";
export type MaterialAvailabilityMode = "immediate" | "scheduled";
export type MaterialExpiryAction = "remove_access" | "enable_download" | "archive";
export type MaterialDownloadStartMode = "after_access" | "scheduled";
export type AccessSessionStatus = "active" | "paused" | "expired" | "ended" | "blocked";

export interface MaterialSummary {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: MaterialStatus;
  visibility: MaterialVisibility;
  availabilityMode: MaterialAvailabilityMode;
  availableFrom: Date | null;
  availableUntil: Date | null;
  accessDurationMinutes: number;
  allowPause: boolean;
  downloadEnabled: boolean;
  downloadStartMode: MaterialDownloadStartMode | null;
  downloadAvailableFrom: Date | null;
  downloadAvailableUntil: Date | null;
  expiryAction: MaterialExpiryAction;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialAccessDecision {
  allowed: boolean;
  reason?:
    | "not_found"
    | "not_published"
    | "not_group_member"
    | "not_available_yet"
    | "availability_expired"
    | "session_required"
    | "session_expired"
    | "session_on_other_device";
}
