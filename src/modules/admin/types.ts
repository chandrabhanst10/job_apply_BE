export type AdminRole =
  | "super_admin"
  | "admin"
  | "support_engineer"
  | "security_manager"
  | "read_only_auditor";

export interface AdminUserFilterOptions {
  search?: string;
  role?: string;
  isSuspended?: boolean;
  limit?: number;
  skip?: number;
}

export interface AdminPlatformStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  verifiedUsers: number;
  totalApplications: number;
  appliedApplications: number;
  pendingApplications: number;
  failedApplications: number;
  totalFeedOpportunities: number;
  totalResumes: number;
}

export interface QueueJobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface FeatureFlagsState {
  autoApplyEnabled: boolean;
  feedScannerEnabled: boolean;
  aiPromptOverridesEnabled: boolean;
  maintenanceMode: boolean;
}
