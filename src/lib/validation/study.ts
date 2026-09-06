import { z } from "zod";

export const personalMaterialIdSchema = z.string().uuid();

export const studySessionSchema = z.object({
  personalMaterialId: personalMaterialIdSchema.optional().nullable(),
  startedAt: z.coerce.date().optional(),
  durationSeconds: z.number().int().min(0).max(24 * 60 * 60),
});

export const personalTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  completed: z.boolean().optional(),
});
