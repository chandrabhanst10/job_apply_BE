import {
  recordConsentCore,
  createDataRequestCore,
  getUserDataRequestsCore,
  getAllDataRequestsCore,
  updateDataRequestStatusCore,
  exportUserDataCore,
  deleteUserResumesCore,
  deleteUserAIHistoryCore,
  deleteUserAccountCore,
  disconnectPlatformConnectionCore,
  getUserActiveSessionsCore,
  revokeUserSessionCore,
  revokeAllUserSessionsCore,
  getComplianceAdminStatsCore,
  getRecentSecurityAuditLogsCore,
  type RecordConsentInput,
  type CreateDataRequestInput,
  type DataRequestType
} from "./core/index.js";
import { auditService } from "../audit/service.js";

export class ComplianceService {
  async recordConsent(input: RecordConsentInput, ipAddress?: string) {
    const user = await recordConsentCore({ ...input, ipAddress });
    if (user) {
      await auditService.record({
        userId: user._id.toString(),
        action: "compliance.consent_updated",
        resource: "user",
        resourceId: user._id.toString(),
        ip: ipAddress
      });
    }
    return user;
  }

  async requestDataAction(userId: string, type: DataRequestType, ipAddress?: string, details?: Record<string, unknown>) {
    const req = await createDataRequestCore({ userId, type, ipAddress, details });
    await auditService.record({
      userId,
      action: `compliance.request_${type}`,
      resource: "data_request",
      resourceId: req._id.toString(),
      ip: ipAddress
    });

    if (type === "export") {
      const exportData = await exportUserDataCore(userId);
      await updateDataRequestStatusCore(req._id, "completed", { exportedAt: exportData.exportedAt });
      return { request: req, exportData };
    }

    if (type === "delete_resumes") {
      const count = await deleteUserResumesCore(userId);
      await updateDataRequestStatusCore(req._id, "completed", { deletedResumesCount: count });
      return { request: req, count };
    }

    if (type === "delete_ai_history") {
      await deleteUserAIHistoryCore(userId);
      await updateDataRequestStatusCore(req._id, "completed");
      return { request: req };
    }

    if (type === "delete_account") {
      await deleteUserAccountCore(userId);
      await updateDataRequestStatusCore(req._id, "completed");
      return { request: req };
    }

    return { request: req };
  }

  async exportUserData(userId: string, ipAddress?: string) {
    await auditService.record({
      userId,
      action: "compliance.data_exported",
      resource: "user",
      resourceId: userId,
      ip: ipAddress
    });
    return exportUserDataCore(userId);
  }

  async getUserRequests(userId: string) {
    return getUserDataRequestsCore(userId);
  }

  async disconnectConnection(userId: string, platform: "linkedin" | "naukri", ipAddress?: string) {
    const user = await disconnectPlatformConnectionCore(userId, platform);
    await auditService.record({
      userId,
      action: `compliance.disconnect_${platform}`,
      resource: "connection",
      resourceId: userId,
      ip: ipAddress
    });
    return user;
  }

  async getUserSessions(userId: string) {
    return getUserActiveSessionsCore(userId);
  }

  async revokeSession(userId: string, sessionId: string, ipAddress?: string) {
    const revoked = await revokeUserSessionCore(userId, sessionId);
    if (revoked) {
      await auditService.record({
        userId,
        action: "compliance.session_revoked",
        resource: "refresh_token",
        resourceId: sessionId,
        ip: ipAddress
      });
    }
    return revoked;
  }

  async revokeAllSessions(userId: string, ipAddress?: string) {
    const count = await revokeAllUserSessionsCore(userId);
    await auditService.record({
      userId,
      action: "compliance.all_sessions_revoked",
      resource: "user",
      resourceId: userId,
      ip: ipAddress
    });
    return count;
  }

  async getAdminStats() {
    const stats = await getComplianceAdminStatsCore();
    const requests = await getAllDataRequestsCore(30);
    const auditLogs = await getRecentSecurityAuditLogsCore(30);
    return { stats, recentRequests: requests, recentAuditLogs: auditLogs };
  }
}

export const complianceService = new ComplianceService();
