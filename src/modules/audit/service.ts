import { createAuditLog, type CreateAuditLogInput } from "./core/index.js";
import { logger } from "../../config/logger.js";

export class AuditService {
  async record(input: CreateAuditLogInput): Promise<void> {
    try {
      await createAuditLog(input);
    } catch (err) {
      logger.error({ err, input }, "Failed to record audit log");
    }
  }
}

export const auditService = new AuditService();
