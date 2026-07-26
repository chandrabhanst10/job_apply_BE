import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/http.js";
import { resumeService } from "./service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { BadRequestError } from "../../utils/app-error.js";

const context = (req: Request) => ({ ip: req.ip, userAgent: req.get("user-agent") });

export const uploadResumeController = asyncHandler(async (req, res) => {
  if (!req.file) throw new BadRequestError("No resume file provided");
  sendSuccess(res, HttpStatus.CREATED, "Resume uploaded and analyzed", await resumeService.upload(req.user!.sub, req.file, context(req)));
});

export const listResumes = asyncHandler(async (req, res) => {
  sendSuccess(res, HttpStatus.OK, "Resumes retrieved", await resumeService.list(req.user!.sub));
});

export const getResume = asyncHandler(async (req, res) => {
  sendSuccess(res, HttpStatus.OK, "Resume retrieved", await resumeService.details(req.user!.sub, String(req.params.id)));
});

export const downloadResume = asyncHandler(async (req, res) => {
  const fileData = await resumeService.download(req.user!.sub, String(req.params.id));
  if (fileData.isUrl) {
    res.redirect(fileData.path);
    return;
  }
  res.download(fileData.path, fileData.originalName);
});

export const deleteResume = asyncHandler(async (req, res) => {
  await resumeService.delete(req.user!.sub, String(req.params.id), context(req));
  sendSuccess(res, HttpStatus.OK, "Resume deleted", null);
});

export const analyzeResume = asyncHandler(async (req, res) => {
  sendSuccess(res, HttpStatus.OK, "Resume analyzed", await resumeService.analyze(req.user!.sub, String(req.params.id)));
});

export const matchResume = asyncHandler(async (req, res) => {
  const { jobDescription } = req.body;
  const matchResult = await resumeService.match(req.user!.sub, String(req.params.id), String(jobDescription || ""));
  sendSuccess(res, HttpStatus.OK, "Resume matched against job description successfully", matchResult);
});
