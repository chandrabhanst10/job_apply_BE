import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/http.js";
import { dashboardService } from "./service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";

export const summary = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, HttpStatus.OK, "Dashboard summary retrieved", await dashboardService.summary(req.user!.sub));
});

export const resumeStats = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, HttpStatus.OK, "Dashboard summary retrieved", await dashboardService.summary(req.user!.sub));
});

export const atsScore = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, HttpStatus.OK, "Dashboard summary retrieved", await dashboardService.summary(req.user!.sub));
});

export const recentActivity = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, HttpStatus.OK, "Recent activity retrieved", await dashboardService.recentActivity(req.user!.sub));
});

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  const csvData = await dashboardService.exportCsvReport(req.user!.sub);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="ai-control-center-report-${Date.now()}.csv"`);
  res.send(csvData);
});
