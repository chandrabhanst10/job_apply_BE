import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import bcrypt from "bcryptjs";

export const DEFAULT_AI_PROMPT = `Analyze this resume to extract suitable target job titles and locations for automated job applying.
If the candidate has frontend or backend skills like ReactJS, NodeJS, JavaScript, Python, Java, etc., please extract and list a rich set of 4-6 specific target job titles matching their technical skill sets (e.g., including "React Developer", "ReactJS Developer", "Node JS Developer", "Node.js Developer", "Frontend Developer", "Backend Engineer", "Full Stack Developer" if they have both frontend and backend skills) to give the user more diverse job search opportunities.`;

export const DEFAULT_PROMPTS = {
  resumeAnalysis: `Analyze this candidate resume and return structured technical skills, experience level, ATS score %, and top recommended job titles.`,
  resumeMatching: `Evaluate how well this resume matches the target job requirements. Calculate resume match %, matching skills list, missing skills list, and application recommendation.`,
  jobExtraction: `Extract job title, company name, recruiter profile URL, required technical skills, experience, and direct application link from this social feed post.`,
  jobClassification: `Classify whether this social post is a genuine hiring opportunity. Return boolean isHiring and key details.`,
  coverLetterGeneration: `Generate a tailored 3-paragraph professional cover letter for this job opening based on candidate resume and skills.`,
  jobSummary: `Summarize key responsibilities, required skills, and salary expectations for this job posting.`,
  atsAnalysis: `Perform deep ATS optimization analysis. Return overall ATS keyword score (0-100%) and list missing high-impact keywords.`,
  skillsExtraction: `Extract all technical and soft skills mentioned in this text as a clean JSON array.`,
  aiRecommendation: `Provide actionable recommendation on whether to apply to this position based on candidate background.`,
  duplicateDetection: `Determine if these two job postings represent duplicate job opportunities.`,
  applicationDecision: `Explain why AI decided to apply or skip this job based on candidate preferences and match score.`,
  followUpMessages: `Draft a professional recruiter follow-up message expressing candidate interest.`
};

const profileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    mobile: { type: String, trim: true, maxlength: 30 },
    linkedIn: { type: String, trim: true, maxlength: 300 },
    github: { type: String, trim: true, maxlength: 300 },
    portfolio: { type: String, trim: true, maxlength: 300 },
    country: { type: String, trim: true, maxlength: 80 },
    city: { type: String, trim: true, maxlength: 80 },
    profileImageUrl: { type: String, trim: true, maxlength: 500 },
    aiPrompt: { type: String, default: DEFAULT_AI_PROMPT },
    targetSkills: [{ type: String, trim: true }]
  },
  { _id: false }
);

const connectedPlatformSchema = new Schema(
  {
    isConnected: { type: Boolean, default: false },
    cookies: { type: String, default: null },
    username: { type: String, trim: true, default: null },
    lastSyncAt: { type: Date, default: null }
  },
  { _id: false }
);

const autopilotSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    feedScanEnabled: { type: Boolean, default: false },
    minMatchScore: { type: Number, default: 60, min: 0, max: 100 },
    jobTitles: [{ type: String, trim: true }],
    locations: [{ type: String, trim: true }],
    lastRunAt: { type: Date, default: null }
  },
  { _id: false }
);

const aiConfigSchema = new Schema(
  {
    prompts: {
      resumeAnalysis: { type: String, default: DEFAULT_PROMPTS.resumeAnalysis },
      resumeMatching: { type: String, default: DEFAULT_PROMPTS.resumeMatching },
      jobExtraction: { type: String, default: DEFAULT_PROMPTS.jobExtraction },
      jobClassification: { type: String, default: DEFAULT_PROMPTS.jobClassification },
      coverLetterGeneration: { type: String, default: DEFAULT_PROMPTS.coverLetterGeneration },
      jobSummary: { type: String, default: DEFAULT_PROMPTS.jobSummary },
      atsAnalysis: { type: String, default: DEFAULT_PROMPTS.atsAnalysis },
      skillsExtraction: { type: String, default: DEFAULT_PROMPTS.skillsExtraction },
      aiRecommendation: { type: String, default: DEFAULT_PROMPTS.aiRecommendation },
      duplicateDetection: { type: String, default: DEFAULT_PROMPTS.duplicateDetection },
      applicationDecision: { type: String, default: DEFAULT_PROMPTS.applicationDecision },
      followUpMessages: { type: String, default: DEFAULT_PROMPTS.followUpMessages }
    },
    jobPreferences: {
      preferredTitles: [{ type: String, trim: true }],
      preferredSkills: [{ type: String, trim: true }],
      preferredIndustries: [{ type: String, trim: true }],
      experienceLevel: { type: String, enum: ["entry", "mid", "senior", "lead", "executive", "any"], default: "any" },
      employmentType: { type: String, enum: ["full_time", "part_time", "contract", "internship", "any"], default: "any" },
      workMode: { type: String, enum: ["remote", "hybrid", "onsite", "any"], default: "any" },
      minSalary: { type: Number, default: 0 },
      maxSalary: { type: Number, default: 0 },
      preferredCompanies: [{ type: String, trim: true }],
      blockedCompanies: [{ type: String, trim: true }],
      preferredTechnologies: [{ type: String, trim: true }],
      preferredKeywords: [{ type: String, trim: true }],
      blockedKeywords: [{ type: String, trim: true }],
      minResumeMatch: { type: Number, default: 60, min: 0, max: 100 },
      minAiConfidence: { type: Number, default: 70, min: 0, max: 100 }
    },
    automation: {
      autoApply: { type: Boolean, default: true },
      manualReview: { type: Boolean, default: false },
      generateCoverLetter: { type: Boolean, default: true },
      retryFailedApplications: { type: Boolean, default: true },
      maxDailyApplications: { type: Number, default: 50, min: 1, max: 200 },
      skipDuplicateJobs: { type: Boolean, default: true },
      skipPreviouslyApplied: { type: Boolean, default: true },
      feedScanFrequencyHours: { type: Number, default: 12 },
      jobBoardScanFrequencyHours: { type: Number, default: 12 }
    },
    aiModel: {
      provider: { type: String, default: "gemini" },
      modelName: { type: String, default: "gemini-2.5-flash" },
      temperature: { type: Number, default: 0.3, min: 0, max: 1 },
      maxTokens: { type: Number, default: 2048 }
    },
    notifications: {
      newJobFound: { type: Boolean, default: true },
      applicationSuccess: { type: Boolean, default: true },
      applicationFailure: { type: Boolean, default: true },
      recruiterReply: { type: Boolean, default: true },
      aiErrors: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: true }
    }
  },
  { _id: false }
);

const legalConsentSchema = new Schema(
  {
    termsAccepted: { type: Boolean, default: true },
    termsVersion: { type: String, default: "1.0" },
    privacyAccepted: { type: Boolean, default: true },
    privacyVersion: { type: String, default: "1.0" },
    cookieAccepted: { type: Boolean, default: true },
    cookieVersion: { type: String, default: "1.0" },
    acceptedAt: { type: Date, default: Date.now },
    ipAddress: { type: String, default: null }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin", "super_admin"], default: "user", index: true },
    isEmailVerified: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    passwordChangedAt: { type: Date },
    profile: { type: profileSchema, required: true },
    legalConsent: { type: legalConsentSchema, default: () => ({}) },
    connections: {
      linkedin: { type: connectedPlatformSchema, default: () => ({}) },
      naukri: { type: connectedPlatformSchema, default: () => ({}) }
    },
    autopilot: {
      linkedin: { type: autopilotSchema, default: () => ({}) },
      naukri: { type: autopilotSchema, default: () => ({}) }
    },
    aiConfig: { type: aiConfigSchema, default: () => ({}) }
  },
  { timestamps: true, versionKey: false }
);

userSchema.methods.comparePassword = function comparePassword(password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  comparePassword(password: string): Promise<boolean>;
};

export const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>("User", userSchema);
