import bcrypt from "bcryptjs";
import { UserModel, type UserDocument } from "../model.js";
import { RefreshTokenModel, type RefreshTokenDocument } from "../refresh-token.model.js";
import type { UserRole } from "../../../types/role.js";
import type { Types } from "mongoose";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  ipAddress?: string;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  cookieAccepted?: boolean;
}

export interface CreateRefreshTokenInput {
  userId: Types.ObjectId | string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  createdByIp?: string;
  userAgent?: string;
}

export async function createUser(input: CreateUserInput): Promise<UserDocument> {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return UserModel.create({
    email: input.email,
    passwordHash,
    role: input.role ?? "user",
    profile: { name: input.name },
    legalConsent: {
      termsAccepted: input.termsAccepted ?? true,
      termsVersion: "1.0",
      privacyAccepted: input.privacyAccepted ?? true,
      privacyVersion: "1.0",
      cookieAccepted: input.cookieAccepted ?? true,
      cookieVersion: "1.0",
      acceptedAt: new Date(),
      ipAddress: input.ipAddress ?? null
    }
  });
}

export async function createRefreshToken(data: CreateRefreshTokenInput): Promise<RefreshTokenDocument> {
  return RefreshTokenModel.create(data);
}
