import {
  queryAdminPlatformStats,
  listAdminUsers,
  updateUserSuspensionStatus,
  updateUserRole,
  listSystemAuditLogs
} from "./core/index.js";
import { applyQueue } from "../../jobs/apply.queue.js";
import type { AdminUserFilterOptions, FeatureFlagsState } from "./types.js";

// In-memory runtime feature flags store
const featureFlagsStore: FeatureFlagsState = {
  autoApplyEnabled: true,
  feedScannerEnabled: true,
  aiPromptOverridesEnabled: true,
  maintenanceMode: false
};

export class AdminService {
  async getPlatformOverview() {
    const stats = await queryAdminPlatformStats();
    let queueMetrics = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        applyQueue.getWaitingCount(),
        applyQueue.getActiveCount(),
        applyQueue.getCompletedCount(),
        applyQueue.getFailedCount(),
        applyQueue.getDelayedCount()
      ]);
      queueMetrics = { waiting, active, completed, failed, delayed };
    } catch {
      // Fallback if Redis Queue is connecting
    }

    return {
      stats,
      queueMetrics,
      featureFlags: featureFlagsStore,
      timestamp: new Date().toISOString()
    };
  }

  async getUsers(options: AdminUserFilterOptions) {
    const result = await listAdminUsers(options);
    const formatted = result.users.map(u => ({
      _id: u._id.toString(),
      name: u.profile?.name || u.email.split("@")[0],
      email: u.email,
      role: u.role || "user",
      isEmailVerified: u.isEmailVerified,
      isSuspended: Boolean(u.isDeleted),
      createdAt: (u as { createdAt?: Date }).createdAt ? (u as { createdAt?: Date }).createdAt!.toISOString() : new Date().toISOString()
    }));
    return { users: formatted, total: result.total, limit: options.limit || 20, skip: options.skip || 0 };
  }

  async setUserStatus(userId: string, isSuspended: boolean) {
    const updated = await updateUserSuspensionStatus(userId, isSuspended);
    if (!updated) throw new Error("User not found");
    return { _id: updated._id.toString(), isSuspended: Boolean(updated.isDeleted) };
  }

  async setUserRole(userId: string, role: string) {
    const updated = await updateUserRole(userId, role);
    if (!updated) throw new Error("User not found");
    return { _id: updated._id.toString(), role: updated.role };
  }

  async getQueueStatus() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      applyQueue.getWaitingCount(),
      applyQueue.getActiveCount(),
      applyQueue.getCompletedCount(),
      applyQueue.getFailedCount(),
      applyQueue.getDelayedCount()
    ]);
    return { name: "job-applications", waiting, active, completed, failed, delayed };
  }

  async handleQueueAction(action: "pause" | "resume" | "retry") {
    if (action === "pause") {
      await applyQueue.pause();
      return { message: "Queue paused successfully" };
    } else if (action === "resume") {
      await applyQueue.resume();
      return { message: "Queue resumed successfully" };
    } else if (action === "retry") {
      const failedJobs = await applyQueue.getFailed();
      for (const job of failedJobs) {
        await job.retry();
      }
      return { message: `Retried ${failedJobs.length} failed jobs` };
    }
    throw new Error("Invalid queue action");
  }

  getFeatureFlags(): FeatureFlagsState {
    return { ...featureFlagsStore };
  }

  toggleFeatureFlag(flagKey: keyof FeatureFlagsState, enabled: boolean): FeatureFlagsState {
    if (flagKey in featureFlagsStore) {
      featureFlagsStore[flagKey] = enabled;
    }
    return { ...featureFlagsStore };
  }

  async getAuditLogs(limit = 50, skip = 0) {
    return listSystemAuditLogs(limit, skip);
  }
}

export const adminService = new AdminService();
