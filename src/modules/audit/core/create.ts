import { AuditLogModel, type AuditLogDocument } from "../model.js";
import type { Types } from "mongoose";

export interface CreateAuditLogInput {
  userId?: Types.ObjectId | string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(data: CreateAuditLogInput): Promise<AuditLogDocument> {
  return AuditLogModel.create(data);
}
