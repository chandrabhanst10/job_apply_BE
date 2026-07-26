import { ResumeModel, type ResumeDocument } from "../model.js";
import { ResumeAnalysisModel, type ResumeAnalysisDocument } from "../analysis.model.js";
import type { Types } from "mongoose";

export interface CreateResumeInput {
  userId: Types.ObjectId | string;
  originalName: string;
  storedName: string;
  path: string;
  mimeType: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  extension: ".pdf" | ".docx";
  size: number;
  checksum: string;
  status?: "uploaded" | "analyzed" | "analysis_failed";
}

export interface UpsertResumeAnalysisInput {
  userId: Types.ObjectId | string;
  resumeId: Types.ObjectId | string;
  skills?: string[];
  experience?: string[];
  education?: string[];
  projects?: string[];
  certifications?: string[];
  atsScore: number;
  summary: string;
  missingSkills?: string[];
  suggestions?: string[];
  provider: "gemini" | "local";
  rawProviderResponse?: unknown;
}

export async function createResume(data: CreateResumeInput): Promise<ResumeDocument> {
  return ResumeModel.create(data);
}

export async function upsertResumeAnalysis(data: UpsertResumeAnalysisInput): Promise<ResumeAnalysisDocument> {
  return ResumeAnalysisModel.findOneAndUpdate({ resumeId: data.resumeId }, { $set: data }, { upsert: true, new: true, runValidators: true }).exec();
}
