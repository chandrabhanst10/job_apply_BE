import type { Request } from "express";
import { HttpStatus } from "../../constants/http.js";
import { userService } from "./service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { BadRequestError } from "../../utils/app-error.js";

const context = (req: Request) => ({ ip: req.ip, userAgent: req.get("user-agent") });

export const getProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, HttpStatus.OK, "Profile retrieved", await userService.getProfile(req.user!.sub));
});

export const updateProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, HttpStatus.OK, "Profile updated", await userService.updateProfile(req.user!.sub, req.body, context(req)));
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user!.sub, context(req));
  sendSuccess(res, HttpStatus.OK, "Account deleted", null);
});

export const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new BadRequestError("No image file provided");
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  sendSuccess(res, HttpStatus.OK, "Profile image uploaded", await userService.updateProfileImage(req.user!.sub, imageUrl, context(req)));
});

export const getAutopilot = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  if (platform !== "linkedin" && platform !== "naukri") {
    throw new BadRequestError("Invalid platform");
  }
  const autopilot = await userService.getAutopilot(req.user!.sub, platform);
  sendSuccess(res, HttpStatus.OK, "Autopilot configuration retrieved", autopilot);
});

export const updateAutopilot = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  if (platform !== "linkedin" && platform !== "naukri") {
    throw new BadRequestError("Invalid platform");
  }
  const autopilot = await userService.updateAutopilot(req.user!.sub, platform, req.body, context(req));
  sendSuccess(res, HttpStatus.OK, "Autopilot configuration updated", autopilot);
});

export const suggestAutopilotCriteria = asyncHandler(async (req, res) => {
  const suggestions = await userService.suggestAutopilotCriteria(req.user!.sub);
  sendSuccess(res, HttpStatus.OK, "Autopilot suggestions generated successfully", suggestions);
});

export const getAiConfig = asyncHandler(async (req, res) => {
  const config = await userService.getAiConfig(req.user!.sub);
  sendSuccess(res, HttpStatus.OK, "AI Configuration retrieved successfully", config);
});

export const updateAiConfig = asyncHandler(async (req, res) => {
  const updated = await userService.updateAiConfig(req.user!.sub, req.body, context(req));
  sendSuccess(res, HttpStatus.OK, "AI Configuration updated successfully", updated);
});

export const resetAiPrompts = asyncHandler(async (req, res) => {
  const prompts = await userService.resetPrompts(req.user!.sub, context(req));
  sendSuccess(res, HttpStatus.OK, "AI Prompts reset to default", prompts);
});

export const testAiPrompt = asyncHandler(async (req, res) => {
  const { promptText, sampleInput } = req.body;
  if (!promptText) throw new BadRequestError("Prompt text is required");
  const result = await userService.testPrompt(req.user!.sub, promptText, sampleInput || "Sample Job Description: Senior Full Stack Engineer at Tech Corp.");
  sendSuccess(res, HttpStatus.OK, "Prompt tested successfully", result);
});
