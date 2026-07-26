export interface ProfileUpdateInput {
  name?: string;
  mobile?: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
  country?: string;
  city?: string;
  aiPrompt?: string;
  targetSkills?: string[];
}

export interface AutopilotUpdateInput {
  enabled?: boolean;
  feedScanEnabled?: boolean;
  minMatchScore?: number;
  jobTitles?: string[];
  locations?: string[];
}
