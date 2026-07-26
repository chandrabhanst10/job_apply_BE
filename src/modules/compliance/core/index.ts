import type { Types } from "mongoose";
import { UserModel, type UserDocument } from "../../auth/model.js";
import { RefreshTokenModel, type RefreshTokenDocument } from "../../auth/refresh-token.model.js";
import { ResumeModel, type ResumeDocument } from "../../resume/model.js";
import { AuditLogModel, type AuditLogDocument } from "../../audit/model.js";
import { DataRequestModel, type DataRequestDocument, type DataRequestType, type DataRequestStatus } from "../compliance.model.js";

export interface RecordConsentInput {
  userId: string | Types.ObjectId;
  termsAccepted?: boolean;
  termsVersion?: string;
  privacyAccepted?: boolean;
  privacyVersion?: string;
  cookieAccepted?: boolean;
  cookieVersion?: string;
  ipAddress?: string;
}

export interface CreateDataRequestInput {
  userId: string | Types.ObjectId;
  type: DataRequestType;
  ipAddress?: string;
  details?: Record<string, unknown>;
}

export interface UserSessionInfo {
  id: string;
  familyId: string;
  createdByIp: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
}

export interface ComplianceAdminStats {
  totalUsers: number;
  termsAcceptedCount: number;
  privacyAcceptedCount: number;
  cookieAcceptedCount: number;
  pendingRequestsCount: number;
  completedRequestsCount: number;
  totalDataRequestsCount: number;
  totalAuditEventsCount: number;
  extensionActiveSessionsCount: number;
}

export async function recordConsentCore(input: RecordConsentInput): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(
    input.userId,
    {
      $set: {
        "legalConsent.termsAccepted": input.termsAccepted ?? true,
        "legalConsent.termsVersion": input.termsVersion ?? "1.0",
        "legalConsent.privacyAccepted": input.privacyAccepted ?? true,
        "legalConsent.privacyVersion": input.privacyVersion ?? "1.0",
        "legalConsent.cookieAccepted": input.cookieAccepted ?? true,
        "legalConsent.cookieVersion": input.cookieVersion ?? "1.0",
        "legalConsent.acceptedAt": new Date(),
        "legalConsent.ipAddress": input.ipAddress ?? null
      }
    },
    { new: true }
  );
}

export async function createDataRequestCore(input: CreateDataRequestInput): Promise<DataRequestDocument> {
  return DataRequestModel.create({
    userId: input.userId,
    type: input.type,
    status: "pending",
    requestedAt: new Date(),
    ipAddress: input.ipAddress ?? null,
    details: input.details ?? null
  });
}

export async function getUserDataRequestsCore(userId: string | Types.ObjectId): Promise<DataRequestDocument[]> {
  return DataRequestModel.find({ userId }).sort({ createdAt: -1 }).exec();
}

export async function getAllDataRequestsCore(limit = 50): Promise<DataRequestDocument[]> {
  return DataRequestModel.find().populate("userId", "email role profile").sort({ createdAt: -1 }).limit(limit).exec();
}

export async function updateDataRequestStatusCore(
  requestId: string | Types.ObjectId,
  status: DataRequestStatus,
  details?: Record<string, unknown>
): Promise<DataRequestDocument | null> {
  const updateData: { status: DataRequestStatus; completedAt?: Date; details?: Record<string, unknown> } = { status };
  if (status === "completed" || status === "failed") {
    updateData.completedAt = new Date();
  }
  if (details) {
    updateData.details = details;
  }
  return DataRequestModel.findByIdAndUpdate(requestId, { $set: updateData }, { new: true });
}

export async function exportUserDataCore(userId: string | Types.ObjectId): Promise<{
  profile: unknown;
  legalConsent: unknown;
  connections: { linkedinConnected: boolean; naukriConnected: boolean };
  aiConfig: unknown;
  resumes: ResumeDocument[];
  dataRequests: DataRequestDocument[];
  exportedAt: string;
}> {
  const user = await UserModel.findById(userId).exec();
  if (!user) {
    throw new Error("User not found");
  }

  const resumes = await ResumeModel.find({ userId, deletedAt: { $exists: false } }).exec();
  const dataRequests = await DataRequestModel.find({ userId }).exec();

  return {
    profile: {
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    legalConsent: user.legalConsent,
    connections: {
      linkedinConnected: Boolean(user.connections?.linkedin?.isConnected),
      naukriConnected: Boolean(user.connections?.naukri?.isConnected)
    },
    aiConfig: {
      jobPreferences: user.aiConfig?.jobPreferences,
      automation: user.aiConfig?.automation,
      aiModel: user.aiConfig?.aiModel
    },
    resumes,
    dataRequests,
    exportedAt: new Date().toISOString()
  };
}

export async function deleteUserResumesCore(userId: string | Types.ObjectId): Promise<number> {
  const result = await ResumeModel.updateMany(
    { userId, deletedAt: { $exists: false } },
    { $set: { deletedAt: new Date() } }
  );
  return result.modifiedCount;
}

export async function deleteUserAIHistoryCore(userId: string | Types.ObjectId): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $unset: {
        "aiConfig.prompts": 1
      }
    },
    { new: true }
  );
}

export async function deleteUserAccountCore(userId: string | Types.ObjectId): Promise<UserDocument | null> {
  await RefreshTokenModel.deleteMany({ userId });
  await ResumeModel.updateMany({ userId }, { $set: { deletedAt: new Date() } });
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        isDeleted: true,
        "connections.linkedin.cookies": null,
        "connections.linkedin.isConnected": false,
        "connections.naukri.cookies": null,
        "connections.naukri.isConnected": false
      }
    },
    { new: true }
  );
}

export async function disconnectPlatformConnectionCore(
  userId: string | Types.ObjectId,
  platform: "linkedin" | "naukri"
): Promise<UserDocument | null> {
  const updateField = platform === "linkedin" ? "connections.linkedin" : "connections.naukri";
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        [updateField]: {
          isConnected: false,
          cookies: null,
          username: null,
          lastSyncAt: null
        }
      }
    },
    { new: true }
  );
}

export async function getUserActiveSessionsCore(userId: string | Types.ObjectId): Promise<UserSessionInfo[]> {
  const tokens = await RefreshTokenModel.find({ userId }).sort({ createdAt: -1 }).exec();
  return tokens.map((t: RefreshTokenDocument) => ({
    id: t._id.toString(),
    familyId: t.familyId,
    createdByIp: t.createdByIp || null,
    userAgent: t.userAgent || null,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    isRevoked: Boolean(t.revokedAt)
  }));
}

export async function revokeUserSessionCore(userId: string | Types.ObjectId, sessionId: string): Promise<boolean> {
  const res = await RefreshTokenModel.deleteOne({ _id: sessionId, userId });
  return res.deletedCount > 0;
}

export async function revokeAllUserSessionsCore(userId: string | Types.ObjectId): Promise<number> {
  const res = await RefreshTokenModel.deleteMany({ userId });
  return res.deletedCount;
}

export async function getComplianceAdminStatsCore(): Promise<ComplianceAdminStats> {
  const totalUsers = await UserModel.countDocuments({ isDeleted: false });
  const termsAcceptedCount = await UserModel.countDocuments({ "legalConsent.termsAccepted": true, isDeleted: false });
  const privacyAcceptedCount = await UserModel.countDocuments({ "legalConsent.privacyAccepted": true, isDeleted: false });
  const cookieAcceptedCount = await UserModel.countDocuments({ "legalConsent.cookieAccepted": true, isDeleted: false });
  const pendingRequestsCount = await DataRequestModel.countDocuments({ status: "pending" });
  const completedRequestsCount = await DataRequestModel.countDocuments({ status: "completed" });
  const totalDataRequestsCount = await DataRequestModel.countDocuments({});
  const totalAuditEventsCount = await AuditLogModel.countDocuments({});
  const extensionActiveSessionsCount = await RefreshTokenModel.countDocuments({ revokedAt: { $exists: false } });

  return {
    totalUsers,
    termsAcceptedCount,
    privacyAcceptedCount,
    cookieAcceptedCount,
    pendingRequestsCount,
    completedRequestsCount,
    totalDataRequestsCount,
    totalAuditEventsCount,
    extensionActiveSessionsCount
  };
}

export async function getRecentSecurityAuditLogsCore(limit = 30): Promise<AuditLogDocument[]> {
  return AuditLogModel.find().sort({ createdAt: -1 }).limit(limit).exec();
}
