import { HttpStatus } from "../../constants/http.js";
import { adminService } from "./admin.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { BadRequestError } from "../../utils/app-error.js";

export const getOverview = asyncHandler(async (_req, res) => {
  const data = await adminService.getPlatformOverview();
  sendSuccess(res, HttpStatus.OK, "Platform overview retrieved successfully", data);
});

export const getUsers = asyncHandler(async (req, res) => {
  const { search, role, isSuspended, limit, skip } = req.query;
  const result = await adminService.getUsers({
    search: search ? String(search) : undefined,
    role: role ? String(role) : undefined,
    isSuspended: isSuspended !== undefined ? isSuspended === "true" : undefined,
    limit: limit ? Number(limit) : 20,
    skip: skip ? Number(skip) : 0
  });
  sendSuccess(res, HttpStatus.OK, "Users retrieved successfully", result);
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { isSuspended } = req.body;
  if (typeof isSuspended !== "boolean") {
    throw new BadRequestError("isSuspended must be a boolean");
  }
  const result = await adminService.setUserStatus(id, isSuspended);
  sendSuccess(res, HttpStatus.OK, `User status updated to ${isSuspended ? "suspended" : "active"}`, result);
});

export const setUserRole = asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { role } = req.body;
  if (!role || typeof role !== "string") {
    throw new BadRequestError("Valid role string is required");
  }
  const result = await adminService.setUserRole(id, role);
  sendSuccess(res, HttpStatus.OK, `User role updated to ${role}`, result);
});

export const getQueueStatus = asyncHandler(async (_req, res) => {
  const data = await adminService.getQueueStatus();
  sendSuccess(res, HttpStatus.OK, "Queue status retrieved", data);
});

export const handleQueueAction = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!action || !["pause", "resume", "retry"].includes(action)) {
    throw new BadRequestError("Invalid action specified");
  }
  const result = await adminService.handleQueueAction(action);
  sendSuccess(res, HttpStatus.OK, result.message, result);
});

export const getFeatureFlags = asyncHandler(async (_req, res) => {
  const flags = adminService.getFeatureFlags();
  sendSuccess(res, HttpStatus.OK, "Feature flags retrieved", flags);
});

export const toggleFeatureFlag = asyncHandler(async (req, res) => {
  const { flagKey, enabled } = req.body;
  if (!flagKey || typeof enabled !== "boolean") {
    throw new BadRequestError("flagKey and boolean enabled state required");
  }
  const updatedFlags = adminService.toggleFeatureFlag(flagKey, enabled);
  sendSuccess(res, HttpStatus.OK, `Feature flag ${flagKey} updated`, updatedFlags);
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const skip = req.query.skip ? Number(req.query.skip) : 0;
  const logs = await adminService.getAuditLogs(limit, skip);
  sendSuccess(res, HttpStatus.OK, "System audit logs retrieved", logs);
});
