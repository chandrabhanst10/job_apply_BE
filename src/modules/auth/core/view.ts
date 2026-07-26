import { UserModel, type UserDocument } from "../model.js";
import { RefreshTokenModel, type RefreshTokenDocument } from "../refresh-token.model.js";

export function findUserByEmail(email: string, includePassword = false): Promise<UserDocument | null> {
  const query = UserModel.findOne({ email: email.toLowerCase(), isDeleted: false });
  return (includePassword ? query.select("+passwordHash") : query).exec();
}

export function findUserById(id: string, includePassword = false): Promise<UserDocument | null> {
  const query = UserModel.findOne({ _id: id, isDeleted: false });
  return (includePassword ? query.select("+passwordHash") : query).exec();
}

export function findActiveRefreshToken(tokenHash: string): Promise<RefreshTokenDocument | null> {
  return RefreshTokenModel.findOne({ tokenHash, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).exec();
}

export function findRecentlyRevokedRefreshToken(tokenHash: string, gracePeriodMs = 30000): Promise<RefreshTokenDocument | null> {
  const cutoff = new Date(Date.now() - gracePeriodMs);
  return RefreshTokenModel.findOne({ tokenHash, revokedAt: { $gte: cutoff }, expiresAt: { $gt: new Date() } }).exec();
}
