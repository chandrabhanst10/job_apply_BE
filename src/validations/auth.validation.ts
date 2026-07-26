import { z } from "zod";

const email = z.string().email().toLowerCase().trim();
const password = z.string().min(8).max(128).regex(/[A-Z]/, "Password must include an uppercase letter").regex(/[a-z]/, "Password must include a lowercase letter").regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({ body: z.object({ name: z.string().min(2).max(120).trim(), email, password }) });
export const loginSchema = z.object({ body: z.object({ email, password: z.string().min(1) }) });
export const refreshSchema = z.object({ body: z.object({ refreshToken: z.string().optional() }).optional() });
export const tokenSchema = z.object({ body: z.object({ token: z.string().min(10) }) });
export const forgotPasswordSchema = z.object({ body: z.object({ email }) });
export const resetPasswordSchema = z.object({ body: z.object({ token: z.string().min(10), password }) });
export const changePasswordSchema = z.object({ body: z.object({ currentPassword: z.string().min(1), newPassword: password }) });
