import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/http.js";
import { connectionService } from "./service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { BadRequestError } from "../../utils/app-error.js";

const context = (req: Request) => ({ ip: req.ip, userAgent: req.get("user-agent") });

export const getStatus = asyncHandler(async (req, res) => {
  const status = await connectionService.getConnectionStatus(req.user!.sub);
  sendSuccess(res, HttpStatus.OK, "Connection status retrieved", status);
});

export const link = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  if (platform !== "linkedin" && platform !== "naukri") {
    throw new BadRequestError("Platform must be linkedin or naukri");
  }
  const result = await connectionService.linkAccount(req.user!.sub, platform, req.body, context(req));
  sendSuccess(res, HttpStatus.OK, `${platform} account connected successfully`, result);
});

export const unlink = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  if (platform !== "linkedin" && platform !== "naukri") {
    throw new BadRequestError("Platform must be linkedin or naukri");
  }
  const result = await connectionService.unlinkAccount(req.user!.sub, platform, context(req));
  sendSuccess(res, HttpStatus.OK, `${platform} account disconnected successfully`, result);
});
