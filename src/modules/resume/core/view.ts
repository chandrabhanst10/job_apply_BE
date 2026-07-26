import mongoose from "mongoose";
import { ResumeModel, type ResumeDocument } from "../model.js";
import { ResumeAnalysisModel, type ResumeAnalysisDocument } from "../analysis.model.js";

export function findResumesByUser(userId: string): Promise<ResumeDocument[]> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return Promise.resolve([]);
  }
  return ResumeModel.find({ userId: new mongoose.Types.ObjectId(userId), deletedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .exec();
}

export function findResumeByIdForUser(id: string, userId: string): Promise<ResumeDocument | null> {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return Promise.resolve(null);
  }
  return ResumeModel.findOne({ 
    _id: new mongoose.Types.ObjectId(id), 
    userId: new mongoose.Types.ObjectId(userId), 
    deletedAt: { $exists: false } 
  }).exec();
}

export function findLatestResumeByUser(userId: string): Promise<ResumeDocument | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return Promise.resolve(null);
  }
  return ResumeModel.findOne({ userId: new mongoose.Types.ObjectId(userId), deletedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .exec();
}

export function findResumeAnalysisByResumeId(resumeId: string): Promise<ResumeAnalysisDocument | null> {
  return ResumeAnalysisModel.findOne({ resumeId }).exec();
}

export async function getResumeAnalysisStatsForUser(userId: string): Promise<{ averageAtsScore: number; analyzedCount: number }> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { averageAtsScore: 0, analyzedCount: 0 };
  }
  const docs = await ResumeAnalysisModel.find({ userId: new mongoose.Types.ObjectId(userId) }).exec();
  if (docs.length === 0) return { averageAtsScore: 0, analyzedCount: 0 };

  const totalScore = docs.reduce((sum, doc) => sum + (doc.atsScore || 0), 0);
  return { averageAtsScore: Math.round(totalScore / docs.length), analyzedCount: docs.length };
}
