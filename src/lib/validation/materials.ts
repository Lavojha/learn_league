import { z } from "zod";
import { MAX_MATERIAL_FILE_SIZE_BYTES, SUPPORTED_MATERIAL_MIME_TYPES } from "@/lib/constants";

export const materialIdSchema = z.string().uuid();
export const materialAvailabilityModeSchema = z.enum(["immediate", "scheduled"]);
export const materialExpiryActionSchema = z.enum(["remove_access", "enable_download", "archive"]);
export const materialDownloadStartModeSchema = z.enum(["after_access", "scheduled"]);

const optionalDate = z.coerce.date().optional().nullable();

export const materialDetailsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
});

export const materialAvailabilitySchema = z.object({
  availabilityMode: materialAvailabilityModeSchema.default("immediate"),
  availableFrom: optionalDate,
  availableUntil: optionalDate,
}).superRefine((value, ctx) => {
  if (value.availabilityMode === "scheduled" && !value.availableFrom) {
    ctx.addIssue({ code: "custom", path: ["availableFrom"], message: "Scheduled availability requires a start time" });
  }
  if (value.availableFrom && value.availableUntil && value.availableUntil <= value.availableFrom) {
    ctx.addIssue({ code: "custom", path: ["availableUntil"], message: "Availability end must be after start" });
  }
});

export const materialAccessSettingsSchema = z.object({
  accessDurationMinutes: z.number().int().min(1).max(7 * 24 * 60),
  allowPause: z.boolean().default(false),
  expiryAction: materialExpiryActionSchema.default("remove_access"),
});

export const materialDownloadSettingsSchema = z.object({
  downloadEnabled: z.boolean().default(false),
  downloadStartMode: materialDownloadStartModeSchema.optional().nullable(),
  downloadAvailableFrom: optionalDate,
  downloadAvailableUntil: optionalDate,
}).superRefine((value, ctx) => {
  if (!value.downloadEnabled) return;
  if (!value.downloadStartMode) {
    ctx.addIssue({ code: "custom", path: ["downloadStartMode"], message: "Download start mode is required when downloads are enabled" });
  }
  if (value.downloadStartMode === "scheduled" && !value.downloadAvailableFrom) {
    ctx.addIssue({ code: "custom", path: ["downloadAvailableFrom"], message: "Scheduled downloads require a start time" });
  }
  if (value.downloadAvailableFrom && value.downloadAvailableUntil && value.downloadAvailableUntil <= value.downloadAvailableFrom) {
    ctx.addIssue({ code: "custom", path: ["downloadAvailableUntil"], message: "Download end must be after start" });
  }
});

export const createMaterialSchema = materialDetailsSchema
  .merge(materialAvailabilitySchema)
  .merge(materialAccessSettingsSchema)
  .merge(materialDownloadSettingsSchema);

export const updateMaterialSchema = createMaterialSchema.partial();

export function isSupportedPdf(mimeType: string, fileSizeBytes: number) {
  return (
    mimeType === SUPPORTED_MATERIAL_MIME_TYPES[0] &&
    Number.isInteger(fileSizeBytes) &&
    fileSizeBytes > 0 &&
    fileSizeBytes <= MAX_MATERIAL_FILE_SIZE_BYTES
  );
}
