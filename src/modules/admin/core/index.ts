import { UserModel, type UserDocument } from "../../../models/user.model.js";
import { JobApplicationModel } from "../../automation/model.js";
import { FeedOpportunityModel } from "../../feed-scanner/opportunity.model.js";
import { ResumeModel } from "../../../models/resume.model.js";
import { AuditLogModel, type AuditLogDocument } from "../../audit/model.js";
import type { AdminUserFilterOptions, AdminPlatformStats } from "../types.js";

export async function queryAdminPlatformStats(): Promise<AdminPlatformStats> {
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    verifiedUsers,
    totalApplications,
    appliedApplications,
    pendingApplications,
    failedApplications,
    totalFeedOpportunities,
    totalResumes
  ] = await Promise.all([
    UserModel.countDocuments({ isDeleted: false }),
    UserModel.countDocuments({ isDeleted: false, isSuspended: false }),
    UserModel.countDocuments({ isDeleted: false, isSuspended: true }),
    UserModel.countDocuments({ isDeleted: false, isEmailVerified: true }),
    JobApplicationModel.countDocuments({}),
    JobApplicationModel.countDocuments({ status: "applied" }),
    JobApplicationModel.countDocuments({ status: "pending" }),
    JobApplicationModel.countDocuments({ status: "failed" }),
    FeedOpportunityModel.countDocuments({}),
    ResumeModel.countDocuments({ deletedAt: { $exists: false } })
  ]);

  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    verifiedUsers,
    totalApplications,
    appliedApplications,
    pendingApplications,
    failedApplications,
    totalFeedOpportunities,
    totalResumes
  };
}

export async function listAdminUsers(options: AdminUserFilterOptions): Promise<{ users: UserDocument[]; total: number }> {
  const query: Record<string, unknown> = { isDeleted: false };

  if (options.role) {
    query.role = options.role;
  }
  if (options.isSuspended !== undefined) {
    query.isSuspended = options.isSuspended;
  }
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: "i" } },
      { email: { $regex: options.search, $options: "i" } }
    ];
  }

  const limit = options.limit || 20;
  const skip = options.skip || 0;

  const [users, total] = await Promise.all([
    UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
    UserModel.countDocuments(query).exec()
  ]);

  return { users, total };
}

export async function updateUserSuspensionStatus(userId: string, isSuspended: boolean): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(userId, { $set: { isSuspended } }, { new: true }).exec();
}

export async function updateUserRole(userId: string, role: string): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(userId, { $set: { role } }, { new: true }).exec();
}

export async function listSystemAuditLogs(limit = 50, skip = 0): Promise<AuditLogDocument[]> {
  return AuditLogModel.find({}).sort({ timestamp: -1 }).skip(skip).limit(limit).exec();
}
