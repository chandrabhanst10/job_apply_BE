import bcrypt from "bcryptjs";
import { UserModel } from "../model.js";
import { RefreshTokenModel } from "../refresh-token.model.js";

export async function markEmailVerified(id: string): Promise<void> {
  await UserModel.updateOne({ _id: id }, { $set: { isEmailVerified: true } });
}

export async function updateUserPassword(id: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  await UserModel.updateOne({ _id: id }, { $set: { passwordHash, passwordChangedAt: new Date() } });
}

export async function revokeRefreshToken(tokenHash: string, ip?: string, replacedByTokenHash?: string): Promise<void> {
  await RefreshTokenModel.updateOne({ tokenHash }, { $set: { revokedAt: new Date(), revokedByIp: ip, replacedByTokenHash } });
}

export async function revokeRefreshTokenFamily(familyId: string, ip?: string): Promise<void> {
  await RefreshTokenModel.updateMany({ familyId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedByIp: ip } });
}

export async function revokeAllRefreshTokensForUser(userId: string, ip?: string): Promise<void> {
  await RefreshTokenModel.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedByIp: ip } });
}
