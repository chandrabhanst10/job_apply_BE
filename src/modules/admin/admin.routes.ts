import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requireAdmin } from "./rbac.middleware.js";
import {
  getOverview,
  getUsers,
  setUserStatus,
  setUserRole,
  getQueueStatus,
  handleQueueAction,
  getFeatureFlags,
  toggleFeatureFlag,
  getAuditLogs
} from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireAdmin());

adminRouter.get("/overview", getOverview);
adminRouter.get("/users", getUsers);
adminRouter.patch("/users/:id/status", setUserStatus);
adminRouter.patch("/users/:id/role", setUserRole);
adminRouter.get("/queues", getQueueStatus);
adminRouter.post("/queues/action", handleQueueAction);
adminRouter.get("/feature-flags", getFeatureFlags);
adminRouter.post("/feature-flags/toggle", toggleFeatureFlag);
adminRouter.get("/audit-logs", getAuditLogs);
