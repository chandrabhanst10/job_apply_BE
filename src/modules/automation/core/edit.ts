import { JobApplicationModel, type JobApplicationDocument } from "../model.js";

export function updateJobApplicationStatus(
  id: string,
  status: "pending" | "applying" | "applied" | "failed",
  error?: string,
  appliedAt?: Date
): Promise<JobApplicationDocument | null> {
  const update: Record<string, unknown> = { status };
  if (error !== undefined) update.error = error;
  if (appliedAt !== undefined) update.appliedAt = appliedAt;
  return JobApplicationModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
}
