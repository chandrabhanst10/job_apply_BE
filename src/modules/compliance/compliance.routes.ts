import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requireAdmin } from "../admin/rbac.middleware.js";
import {
  handleRecordConsent,
  handleExportUserData,
  handleRequestDataAction,
  handleGetUserRequests,
  handleDisconnectPlatform,
  handleGetUserSessions,
  handleRevokeUserSession,
  handleRevokeAllSessions,
  handleGetAdminStats
} from "./compliance.controller.js";

export const complianceRouter = Router();

// User Compliance Routes (Require Authentication)
complianceRouter.post("/consent", authenticate, handleRecordConsent);
complianceRouter.get("/export-data", authenticate, handleExportUserData);
complianceRouter.post("/request-action", authenticate, handleRequestDataAction);
complianceRouter.get("/requests", authenticate, handleGetUserRequests);
complianceRouter.post("/disconnect", authenticate, handleDisconnectPlatform);
complianceRouter.get("/sessions", authenticate, handleGetUserSessions);
complianceRouter.delete("/sessions/:sessionId", authenticate, handleRevokeUserSession);
complianceRouter.post("/sessions/revoke-all", authenticate, handleRevokeAllSessions);

// Admin Compliance Routes
complianceRouter.get("/admin/stats", authenticate, requireAdmin(), handleGetAdminStats);
