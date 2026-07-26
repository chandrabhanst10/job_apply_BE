export interface FeedScannerSettingsInput {
  feedScanEnabled?: boolean;
  minMatchScore?: number;
}

export interface FeedOpportunityFilter {
  status?: string;
  minScore?: number;
}

export interface FeedOpportunityQueryOptions {
  userId: string;
  filter?: FeedOpportunityFilter;
  limit?: number;
  skip?: number;
}
