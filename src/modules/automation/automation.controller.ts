import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/http.js";
import { automationService } from "./service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";

const context = (req: Request) => ({ ip: req.ip, userAgent: req.get("user-agent") });

export const triggerCrawl = asyncHandler(async (req: Request, res: Response) => {
  const result = await automationService.triggerCrawl(req.user!.sub, context(req));
  sendSuccess(res, HttpStatus.OK, result.message, null);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const result = await automationService.getHistory(req.user!.sub, limit, skip);
  sendSuccess(res, HttpStatus.OK, "Job application history retrieved", result);
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await automationService.getStats(req.user!.sub);
  sendSuccess(res, HttpStatus.OK, "Job application statistics retrieved", stats);
});
