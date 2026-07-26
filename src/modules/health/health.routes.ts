import { Router } from "express";
import { getLiveness, getReadiness, getDetailedHealth } from "./health.controller.js";

export const healthRouter = Router();

healthRouter.get("/liveness", getLiveness);
healthRouter.get("/readiness", getReadiness);
healthRouter.get("/detailed", getDetailedHealth);
