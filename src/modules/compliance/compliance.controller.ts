import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response.js";
import { HttpStatus } from "../../constants/http.js";
import { complianceService } from "./compliance.service.js";
import type { DataRequestType } from "./compliance.model.js";

export async function handleRecordConsent(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Unauthorized", data: null, errors: [] });
    return;
  }
  const { termsAccepted, termsVersion, privacyAccepted, privacyVersion, cookieAccepted, cookieVersion } = req.body;
  const user = await complianceService.recordConsent(
    {
      userId,
      termsAccepted,
      termsVersion,
      privacyAccepted,
      privacyVersion,
      cookieAccepted,
      cookieVersion
    },
    req.ip
  );
  sendSuccess(res, HttpStatus.OK, "Consent recorded successfully", { legalConsent: user?.legalConsent });
}

export async function handleExportUserData(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Unauthorized", data: null, errors: [] });
    return;
  }
  const exportData = await complianceService.exportUserData(userId, req.ip);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="user_data_export_${userId}.json"`);
  res.status(HttpStatus.OK).send(JSON.stringify(exportData, null, 2));
}

export async function handleRequestDataAction(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Unauthorized", data: null, errors: [] });
    return;
  }
  const { type, details } = req.body as { type: DataRequestType; details?: Record<string, unknown> };
  const result = await complianceService.requestDataAction(userId, type, req.ip, details);
  sendSuccess(res, HttpStatus.OK, `Data action '${type}' requested successfully`, result);
}

export async function handleGetUserRequests(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Unauthorized", data: null, errors: [] });
    return;
  }
  const requests = await complianceService.getUserRequests(userId);
  sendSuccess(res, HttpStatus.OK, "User data requests fetched successfully", { requests });
}

export async function handleDisconnectPlatform(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Unauthorized", data: null, errors: [] });
    return;
  }
  const { platform } = req.body as { platform: "linkedin" | "naukri" };
  await complianceService.disconnectConnection(userId, platform, req.ip);
  sendSuccess(res, HttpStatus.OK, `${platform} disconnected successfully`, { platform });
}

export async function handleGetUserSessions(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Unauthorized", data: null, errors: [] });
    return;
  }
  const sessions = await complianceService.getUserSessions(userId);
  sendSuccess(res, HttpStatus.OK, "User sessions retrieved successfully", { sessions });
}

export async function handleRevokeUserSession(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Unauthorized", data: null, errors: [] });
    return;
  }
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const revoked = await complianceService.revokeSession(userId, sessionId, req.ip);
  sendSuccess(res, HttpStatus.OK, revoked ? "Session revoked successfully" : "Session not found", { revoked });
}

export async function handleRevokeAllSessions(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Unauthorized", data: null, errors: [] });
    return;
  }
  const count = await complianceService.revokeAllSessions(userId, req.ip);
  sendSuccess(res, HttpStatus.OK, "All sessions revoked successfully", { count });
}

export async function handleGetAdminStats(req: Request, res: Response): Promise<void> {
  const adminData = await complianceService.getAdminStats();
  sendSuccess(res, HttpStatus.OK, "Admin compliance statistics fetched successfully", adminData);
}
