import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/http.js";
import { authService } from "./service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { UnauthorizedError } from "../../utils/app-error.js";

const context = (req: Request) => ({ ip: req.ip, userAgent: req.get("user-agent") });

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const options = authService.cookieOptions();
  res.cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, context(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, HttpStatus.CREATED, "Registration successful", result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, context(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, HttpStatus.OK, "Login successful", result);
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken ?? req.cookies.refreshToken;
  if (!token) {
    throw new UnauthorizedError("Refresh token is missing");
  }
  const result = await authService.refresh(token, context(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, HttpStatus.OK, "Token refreshed", result);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body?.refreshToken ?? req.cookies.refreshToken, req.user?.sub, context(req));
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  sendSuccess(res, HttpStatus.OK, "Logout successful", null);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  sendSuccess(res, HttpStatus.OK, "Email verified", null);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  sendSuccess(res, HttpStatus.OK, "Password reset instructions generated when the email exists", result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, HttpStatus.OK, "Password reset successful", null);
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  sendSuccess(res, HttpStatus.OK, "Password changed successfully", null);
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, HttpStatus.OK, "Current user retrieved", await authService.currentUser(req.user!.sub));
});

export const oauthLogin = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code } = req.body;
  const result = await authService.oauthLogin(String(provider), String(code), context(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, HttpStatus.OK, "OAuth login successful", result);
});
