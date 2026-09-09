import { z } from "zod";

export const groupRoleSchema = z.enum(["owner", "co_owner", "admin", "member"]);
export const groupTypeSchema = z.enum(["public", "private"]);
export const groupVisibilitySchema = z.enum(["discoverable", "hidden"]);

export const createGroupSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(1000).optional().nullable(),
    type: groupTypeSchema.default("private"),
    visibility: groupVisibilitySchema.default("hidden"),
  })
  .superRefine((value, ctx) => {
    if (value.type === "public" && value.visibility === "hidden") {
      ctx.addIssue({
        code: "custom",
        path: ["visibility"],
        message: "Public groups must be discoverable",
      });
    }
  });

export const groupIdSchema = z.string().uuid();
export const userIdSchema = z.string().uuid();

export const updateGroupSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  type: groupTypeSchema.optional(),
  visibility: groupVisibilitySchema.optional(),
});

export const updateMemberRoleSchema = z.object({
  userId: userIdSchema,
  role: groupRoleSchema,
});

export const joinGroupSchema = z
  .object({
    groupId: groupIdSchema.optional(),
    inviteCode: z.string().trim().min(4).max(128).optional(),
  })
  .refine((value) => Boolean(value.groupId || value.inviteCode), {
    message: "groupId or inviteCode is required",
  });

export const reviewJoinRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

export const respondInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
});
