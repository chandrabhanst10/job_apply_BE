export interface AutomationStats {
  total: number;
  pending: number;
  applying: number;
  applied: number;
  failed: number;
}

export interface TriggerCrawlContext {
  ip?: string;
  userAgent?: string;
}

export interface FormattedFeedOpportunity {
  _id: string;
  platform: string;
  jobUrl: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  status: string;
  error?: string;
  createdAt: string;
  appliedAt?: string;
}
