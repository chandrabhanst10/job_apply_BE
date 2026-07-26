import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import bcrypt from "bcrypt";

export const DEFAULT_AI_PROMPT = `Analyze this resume to extract suitable target job titles and locations for automated job applying.
If the candidate has frontend or backend skills like ReactJS, NodeJS, JavaScript, Python, Java, etc., please extract and list a rich set of 4-6 specific target job titles matching their technical skill sets (e.g., including "React Developer", "ReactJS Developer", "Node JS Developer", "Node.js Developer", "Frontend Developer", "Backend Engineer", "Full Stack Developer" if they have both frontend and backend skills) to give the user more diverse job search opportunities.`;

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

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin", "super_admin"], default: "user", index: true },
    isEmailVerified: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    passwordChangedAt: { type: Date },
    profile: { type: profileSchema, required: true },
    connections: {
      linkedin: { type: connectedPlatformSchema, default: () => ({}) },
      naukri: { type: connectedPlatformSchema, default: () => ({}) }
    },
    autopilot: {
      linkedin: { type: autopilotSchema, default: () => ({}) },
      naukri: { type: autopilotSchema, default: () => ({}) }
    }
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
