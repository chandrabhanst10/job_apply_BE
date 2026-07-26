import { HttpStatus } from "../../constants/http.js";
import { extensionService } from "./extension.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { BadRequestError } from "../../utils/app-error.js";

export const generatePairingPin = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const result = await extensionService.generatePairingPin(userId);
  sendSuccess(res, HttpStatus.OK, "Pairing PIN generated", result);
});

export const pairWithPin = asyncHandler(async (req, res) => {
  const { pin, extensionVersion, browserName } = req.body;
  if (!pin || typeof pin !== "string" || pin.length !== 6) {
    throw new BadRequestError("Valid 6-digit PIN is required");
  }

  const result = await extensionService.pairWithPin(pin, extensionVersion || "1.0.0", browserName);
  sendSuccess(res, HttpStatus.OK, "Extension paired via PIN successfully", result);
});

export const pairExtension = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const { extensionVersion, browserName } = req.body;
  if (!extensionVersion) {
    throw new BadRequestError("extensionVersion is required");
  }

  const result = await extensionService.pairExtension(userId, extensionVersion, browserName);
  sendSuccess(res, HttpStatus.OK, "Extension paired successfully", result);
});

export const syncCookies = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const { platform, cookies } = req.body;
  if (!platform || !["linkedin", "naukri", "indeed"].includes(platform)) {
    throw new BadRequestError("Invalid platform specified");
  }
  if (!Array.isArray(cookies)) {
    throw new BadRequestError("Cookies must be an array");
  }

  const result = await extensionService.syncCookies(userId, platform, cookies);
  sendSuccess(res, HttpStatus.OK, `Encrypted cookies synced for ${platform}`, result);
});

export const getExtensionStatus = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const result = await extensionService.getExtensionStatus(userId);
  sendSuccess(res, HttpStatus.OK, "Extension connection status retrieved", result);
});

export const heartbeat = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const result = await extensionService.heartbeat(userId);
  sendSuccess(res, HttpStatus.OK, "Heartbeat acknowledged", result);
});

export const disconnectExtension = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const result = await extensionService.disconnectExtension(userId);
  sendSuccess(res, HttpStatus.OK, "Extension disconnected", result);
});
