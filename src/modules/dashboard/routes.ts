import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { summary, resumeStats, atsScore, recentActivity, exportReport } from "./controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get("/summary", summary);
dashboardRouter.get("/resume-statistics", resumeStats);
dashboardRouter.get("/ats-score", atsScore);
dashboardRouter.get("/recent-activity", recentActivity);
dashboardRouter.get("/export-report", exportReport);
