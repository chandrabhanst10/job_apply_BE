import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export type UserRole = "user" | "admin" | "super_admin";

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function signRefreshToken(payload: JwtPayload & { tokenId: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` });
}

export function verifyRefreshToken(token: string): JwtPayload & { tokenId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload & { tokenId: string };
}

export function signPurposeToken(userId: string, purpose: "email" | "password-reset"): string {
  const secret = purpose === "email" ? env.JWT_EMAIL_SECRET : env.JWT_PASSWORD_RESET_SECRET;
  return jwt.sign({ sub: userId, purpose }, secret, { expiresIn: "30m" });
}

export function verifyPurposeToken(token: string, purpose: "email" | "password-reset"): { sub: string; purpose: string } {
  const secret = purpose === "email" ? env.JWT_EMAIL_SECRET : env.JWT_PASSWORD_RESET_SECRET;
  return jwt.verify(token, secret) as { sub: string; purpose: string };
}
