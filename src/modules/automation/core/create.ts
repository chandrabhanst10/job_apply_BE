import { JobApplicationModel, type JobApplicationDocument } from "../model.js";
import type { Types } from "mongoose";

export interface CreateJobApplicationInput {
  userId: Types.ObjectId | string;
  platform: "linkedin" | "naukri";
  jobUrl: string;
  jobTitle?: string;
  company?: string;
  status?: "pending" | "applying" | "applied" | "failed";
}

export async function createJobApplication(data: CreateJobApplicationInput): Promise<JobApplicationDocument> {
  return JobApplicationModel.create(data);
}
