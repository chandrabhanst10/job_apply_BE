import type { Types } from "mongoose";

export interface AuditLogInput {
  userId?: Types.ObjectId | string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
