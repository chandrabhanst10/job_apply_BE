import { HttpStatus } from "../../constants/http.js";
import { developerService } from "./developer.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { BadRequestError } from "../../utils/app-error.js";

export const createApiKey = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const { name, scopes, expiresInDays } = req.body;
  if (!name || typeof name !== "string") {
    throw new BadRequestError("Valid API key name is required");
  }

  const result = await developerService.generateApiKey(userId, { name, scopes, expiresInDays });
  sendSuccess(res, HttpStatus.CREATED, "Developer API key created successfully", result);
});

export const getApiKeys = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const keys = await developerService.getApiKeys(userId);
  sendSuccess(res, HttpStatus.OK, "API keys retrieved successfully", keys);
});

export const revokeApiKey = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const keyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!keyId) throw new BadRequestError("API key ID required");
  const result = await developerService.revokeApiKey(userId, keyId);
  sendSuccess(res, HttpStatus.OK, "API key revoked successfully", result);
});
