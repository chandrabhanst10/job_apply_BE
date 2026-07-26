import { HttpStatus } from "../../constants/http.js";
import { promptService } from "./prompt.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { BadRequestError } from "../../utils/app-error.js";

export const getAllPrompts = asyncHandler(async (req, res) => {
  const prompts = await promptService.getAllPromptsForUser(req.user!.sub);
  sendSuccess(res, HttpStatus.OK, "Prompts retrieved successfully", prompts);
});

export const savePromptOverride = asyncHandler(async (req, res) => {
  const promptKey = Array.isArray(req.params.promptKey) ? req.params.promptKey[0] : String(req.params.promptKey || "");
  const { customPrompt } = req.body;
  if (!promptKey || !customPrompt) {
    throw new BadRequestError("promptKey and customPrompt are required");
  }
  const result = await promptService.saveUserOverride(req.user!.sub, promptKey, String(customPrompt));
  sendSuccess(res, HttpStatus.OK, "User prompt override saved", result);
});

export const resetPromptOverride = asyncHandler(async (req, res) => {
  const promptKey = Array.isArray(req.params.promptKey) ? req.params.promptKey[0] : String(req.params.promptKey || "");
  if (!promptKey) {
    throw new BadRequestError("promptKey is required");
  }
  const result = await promptService.resetUserOverride(req.user!.sub, promptKey);
  sendSuccess(res, HttpStatus.OK, "Prompt reset to default", result);
});

export const testPrompt = asyncHandler(async (req, res) => {
  const { promptText, sampleInput } = req.body;
  if (!promptText) {
    throw new BadRequestError("promptText is required");
  }
  const result = await promptService.testPrompt(String(promptText), String(sampleInput || "Sample input test string."));
  sendSuccess(res, HttpStatus.OK, "Prompt tested successfully", result);
});
