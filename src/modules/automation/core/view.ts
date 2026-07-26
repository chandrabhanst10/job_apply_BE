import { JobApplicationModel, type JobApplicationDocument } from "../model.js";

export function findJobApplicationById(id: string): Promise<JobApplicationDocument | null> {
  return JobApplicationModel.findById(id).exec();
}

export function findJobApplicationByUserAndJobUrl(userId: string, jobUrl: string): Promise<JobApplicationDocument | null> {
  return JobApplicationModel.findOne({ userId, jobUrl }).exec();
}

export function listJobApplicationsByUser(userId: string, limit = 50, skip = 0): Promise<JobApplicationDocument[]> {
  return JobApplicationModel.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
}

export async function countJobApplicationStats(userId: string) {
  const [total, pending, applying, applied, failed] = await Promise.all([
    JobApplicationModel.countDocuments({ userId }),
    JobApplicationModel.countDocuments({ userId, status: "pending" }),
    JobApplicationModel.countDocuments({ userId, status: "applying" }),
    JobApplicationModel.countDocuments({ userId, status: "applied" }),
    JobApplicationModel.countDocuments({ userId, status: "failed" })
  ]);
  return { total, pending, applying, applied, failed };
}

export function findQueuedJobApplications(userId: string, limit = 10): Promise<JobApplicationDocument[]> {
  return JobApplicationModel.find({
    userId,
    status: { $in: ["pending", "queued"] }
  }).limit(limit).exec();
}
