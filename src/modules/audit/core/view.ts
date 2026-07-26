import { AuditLogModel, type AuditLogDocument } from "../model.js";

export async function findAuditLogsByUserId(userId: string, limit = 50, skip = 0): Promise<AuditLogDocument[]> {
  return AuditLogModel.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
}
