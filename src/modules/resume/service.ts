import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { BadRequestError, NotFoundError } from "../../utils/app-error.js";
import { resumeAnalyzer } from "../../ai/resume-analyzer.js";
import { auditService } from "../audit/service.js";
import { isCloudinaryConfigured, uploadToCloudinary } from "../../config/cloudinary.js";
import { notificationService } from "../notification/service.js";
import { updateUserProfile, updateUserAutopilot } from "../user/core/index.js";
import { runAutopilotCrawl } from "../../jobs/scrape.worker.js";
import { runFeedScannerCrawl } from "../../jobs/feed-scanner.worker.js";
import {
  createResume,
  upsertResumeAnalysis,
  findResumesByUser,
  findResumeByIdForUser,
  findResumeAnalysisByResumeId,
  setResumeStatus,
  updateResumePath,
  softDeleteResume
} from "./core/index.js";

export class ResumeService {
  async upload(
    userId: string,
    file: Express.Multer.File,
    context: { ip?: string; userAgent?: string }
  ) {
    const buffer = await fs.readFile(file.path);
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    const resume = await createResume({
      userId,
      originalName: file.originalname,
      storedName: file.filename,
      path: file.path,
      mimeType: file.mimetype as "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: path.extname(file.originalname).toLowerCase() as ".pdf" | ".docx",
      size: file.size,
      checksum,
      status: "uploaded"
    });
    
    await auditService.record({ userId, action: "resume.upload", resource: "resume", resourceId: resume._id.toString(), ...context });
    
    try {
      await this.analyze(userId, resume._id.toString());
      
      if (isCloudinaryConfigured()) {
        try {
          const cloudinaryResult = await uploadToCloudinary(file.path, "resumes");
          await updateResumePath(resume._id.toString(), cloudinaryResult.secure_url);
          resume.path = cloudinaryResult.secure_url;
        } catch (cloudinaryErr) {
          console.warn("Failed to upload resume to Cloudinary, keeping local path:", cloudinaryErr);
        }
      }
    } catch (analysisErr) {
      console.warn("Auto-analysis after resume upload failed, keeping uploaded state:", analysisErr);
    }
    
    return resume;
  }

  async list(userId: string) {
    return findResumesByUser(userId);
  }

  async details(userId: string, resumeId: string) {
    const resume = await findResumeByIdForUser(resumeId, userId);
    if (!resume) throw new NotFoundError("Resume not found");
    const analysis = await findResumeAnalysisByResumeId(resume._id.toString());
    return { resume, analysis };
  }

  async download(userId: string, resumeId: string) {
    const resume = await findResumeByIdForUser(resumeId, userId);
    if (!resume) throw new NotFoundError("Resume not found");

    if (resume.path.startsWith("http://") || resume.path.startsWith("https://")) {
      return { isUrl: true, path: resume.path, originalName: resume.originalName, mimeType: resume.mimeType };
    }

    try {
      await fs.access(resume.path);
    } catch {
      throw new NotFoundError("Resume file is missing on storage server");
    }

    return { isUrl: false, path: resume.path, originalName: resume.originalName, mimeType: resume.mimeType };
  }

  async delete(userId: string, resumeId: string, context: { ip?: string; userAgent?: string }) {
    const resume = await findResumeByIdForUser(resumeId, userId);
    if (!resume) throw new NotFoundError("Resume not found");
    
    await softDeleteResume(resumeId, userId);
    await auditService.record({ userId, action: "resume.delete", resource: "resume", resourceId: resumeId, ...context });
  }

  async analyze(userId: string, resumeId: string) {
    const resume = await findResumeByIdForUser(resumeId, userId);
    if (!resume) throw new NotFoundError("Resume not found");

    notificationService.send(userId, "resume.processing", { id: resumeId, fileName: resume.originalName });

    try {
      const result = await resumeAnalyzer.analyze(resume.path, resume.mimeType, userId);
      const analysis = await upsertResumeAnalysis({ userId, resumeId, ...result });
      await setResumeStatus(resumeId, "analyzed");

      // Extract AI-suggested job titles & update user profile + autopilot criteria automatically
      try {
        const suggestions = await resumeAnalyzer.suggestAutopilot(
          resume.path,
          resume.mimeType,
          undefined,
          result.skills,
          userId
        );

        if (result.skills && result.skills.length > 0) {
          await updateUserProfile(userId, { "profile.targetSkills": result.skills });
        }

        if (suggestions.jobTitles && suggestions.jobTitles.length > 0) {
          await updateUserAutopilot(userId, "linkedin", { enabled: true, jobTitles: suggestions.jobTitles });
          await updateUserAutopilot(userId, "naukri", { enabled: true, jobTitles: suggestions.jobTitles });
        }

        // Trigger immediate background scanning and application workflow for this user
        runAutopilotCrawl().catch((err) => console.error("[Resume Analysis] Background crawl error:", err));
        runFeedScannerCrawl().catch((err) => console.error("[Resume Analysis] Feed scan error:", err));
      } catch (suggestErr) {
        console.warn("[Resume Analysis] Autopilot criteria update error:", suggestErr);
      }

      notificationService.send(userId, "resume.completed", {
        id: resumeId,
        fileName: resume.originalName,
        score: result.atsScore,
        provider: result.provider
      });

      return analysis;
    } catch (err: unknown) {
      await setResumeStatus(resumeId, "analysis_failed");
      const errMsg = err instanceof Error ? err.message : String(err);
      notificationService.send(userId, "resume.failed", { id: resumeId, fileName: resume.originalName, error: errMsg });
      throw err;
    }
  }

  async match(userId: string, resumeId: string, jobDescription: string) {
    if (!jobDescription || jobDescription.trim().length < 10) {
      throw new BadRequestError("Job description must be at least 10 characters long");
    }

    const resume = await findResumeByIdForUser(resumeId, userId);
    if (!resume) throw new NotFoundError("Resume not found");

    return resumeAnalyzer.match(resume.path, resume.mimeType, jobDescription, userId);
  }
}

export const resumeService = new ResumeService();
