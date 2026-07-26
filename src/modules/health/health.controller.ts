import { HttpStatus } from "../../constants/http.js";
import { healthService } from "./health.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";

export const getLiveness = asyncHandler(async (_req, res) => {
  sendSuccess(res, HttpStatus.OK, "Service alive", {
    status: "up",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

export const getReadiness = asyncHandler(async (_req, res) => {
  const health = await healthService.getDetailedHealth();
  const statusCode = health.status === "down" ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
  sendSuccess(res, statusCode, `Service readiness status: ${health.status}`, health);
});

export const getDetailedHealth = asyncHandler(async (_req, res) => {
  const health = await healthService.getDetailedHealth();
  const statusCode = health.status === "down" ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
  sendSuccess(res, statusCode, "Detailed health report generated", health);
});
