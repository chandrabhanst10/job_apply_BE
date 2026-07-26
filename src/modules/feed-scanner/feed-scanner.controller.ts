import type { Request, Response } from "express";
import { feedScannerService } from "./service.js";
import { sendSuccess } from "../../utils/response.js";
import { HttpStatus } from "../../constants/http.js";

export async function getPosts(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
  const skip = Math.max(0, Number(req.query.skip) || 0);

  const result = await feedScannerService.getPosts(userId, limit, skip);
  sendSuccess(res, HttpStatus.OK, "Feed posts retrieved successfully", result);
}

export async function getOpportunities(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const status = req.query.status ? String(req.query.status) : undefined;
  const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
  const skip = Math.max(0, Number(req.query.skip) || 0);

  const result = await feedScannerService.getOpportunities(userId, { status, minScore }, limit, skip);
  sendSuccess(res, HttpStatus.OK, "Feed opportunities retrieved successfully", result);
}

export async function triggerScan(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const context = { ip: req.ip, userAgent: req.headers["user-agent"] };

  const result = await feedScannerService.triggerScan(userId, context);
  sendSuccess(res, HttpStatus.OK, result.message, result);
}

export async function applyToOpportunity(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const opportunityId = String(req.params.id);
  const context = { ip: req.ip, userAgent: req.headers["user-agent"] };

  const result = await feedScannerService.applyToOpportunity(userId, opportunityId, context);
  sendSuccess(res, HttpStatus.OK, result.message, result);
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { feedScanEnabled, minMatchScore } = req.body;

  const result = await feedScannerService.updateSettings(userId, { feedScanEnabled, minMatchScore });
  sendSuccess(res, HttpStatus.OK, "Feed scanner settings updated successfully", result);
}
