import { z } from "zod";

export const emailSchema = z.string().trim().email().max(320);
export const passwordSchema = z.string().min(8).max(72);

export const signupSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
