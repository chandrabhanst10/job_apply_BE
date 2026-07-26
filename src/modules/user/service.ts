import { NotFoundError } from "../../utils/app-error.js";
import { findUserById, updateUserProfile, updateUserAutopilot, updateUserAiConfig, softDeleteUser } from "./core/index.js";
import { auditService } from "../audit/service.js";
import { resumeAnalyzer } from "../../ai/resume-analyzer.js";
import { findLatestResumeByUser } from "../resume/index.js";
import { DEFAULT_PROMPTS } from "../auth/model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";

export class UserService {
  async getProfile(userId: string) {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  async updateProfile(
    userId: string,
    profileData: Record<string, unknown>,
    context: { ip?: string; userAgent?: string }
  ) {
    const updated = await updateUserProfile(userId, { profile: profileData });
    if (!updated) throw new NotFoundError("User not found");
    await auditService.record({ userId, action: "user.update_profile", resource: "user", resourceId: userId, ...context });
    return updated;
  }

  async updateProfileImage(
    userId: string,
    imageUrl: string,
    context: { ip?: string; userAgent?: string }
  ) {
    const updated = await updateUserProfile(userId, { "profile.profileImageUrl": imageUrl });
    if (!updated) throw new NotFoundError("User not found");
    await auditService.record({ userId, action: "user.update_avatar", resource: "user", resourceId: userId, ...context });
    return updated;
  }

  async deleteAccount(userId: string, context: { ip?: string; userAgent?: string }) {
    const deleted = await softDeleteUser(userId);
    if (!deleted) throw new NotFoundError("User not found");
    await auditService.record({ userId, action: "user.delete_account", resource: "user", resourceId: userId, ...context });
  }

  async getAutopilot(userId: string, platform: "linkedin" | "naukri") {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");
    return user.autopilot?.[platform] || { enabled: false, jobTitles: [], locations: [] };
  }

  async updateAutopilot(
    userId: string,
    platform: "linkedin" | "naukri",
    data: { enabled?: boolean; feedScanEnabled?: boolean; minMatchScore?: number; jobTitles?: string[]; locations?: string[] },
    context: { ip?: string; userAgent?: string }
  ) {
    const updated = await updateUserAutopilot(userId, platform, data);
    if (!updated) throw new NotFoundError("User not found");
    await auditService.record({ userId, action: `user.update_autopilot_${platform}`, resource: "user", resourceId: userId, ...context });
    return updated.autopilot?.[platform];
  }

  async getAiConfig(userId: string) {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");
    return user.aiConfig || {};
  }

  async updateAiConfig(
    userId: string,
    aiConfigData: Record<string, unknown>,
    context: { ip?: string; userAgent?: string }
  ) {
    const updated = await updateUserAiConfig(userId, aiConfigData);
    if (!updated) throw new NotFoundError("User not found");
    await auditService.record({ userId, action: "user.update_ai_config", resource: "user", resourceId: userId, ...context });
    return updated.aiConfig;
  }

  async resetPrompts(userId: string, context: { ip?: string; userAgent?: string }) {
    const updated = await updateUserAiConfig(userId, { prompts: DEFAULT_PROMPTS });
    if (!updated) throw new NotFoundError("User not found");
    await auditService.record({ userId, action: "user.reset_ai_prompts", resource: "user", resourceId: userId, ...context });
    return updated.aiConfig?.prompts;
  }

  async testPrompt(
    _userId: string,
    promptText: string,
    sampleInput: string
  ) {
    if (!env.GEMINI_API_KEY) {
      return { output: `[Simulated Gemini AI Output]:\nBased on your prompt instruction:\n"${promptText}"\n\nAnalyzed input:\n"${sampleInput}"\n\nResult: Execution successful with 95% match confidence.` };
    }

    try {
      const ai = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = ai.getGenerativeModel({ model: env.GEMINI_MODEL || "gemini-1.5-flash" });
      const fullPrompt = `${promptText}\n\nSample Input Data:\n${sampleInput}`;
      const result = await model.generateContent(fullPrompt);
      return { output: result.response.text().trim() };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { output: `Prompt Execution Note: ${errMsg}\n\nProcessed Prompt Preview:\n"${promptText}"` };
    }
  }

  async suggestAutopilotCriteria(userId: string) {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");

    const resume = await findLatestResumeByUser(userId);
    if (!resume) {
      return {
        jobTitles: ["Software Engineer", "Full Stack Developer", "Backend Engineer"],
        locations: ["Bangalore", "Remote"]
      };
    }

    const customPrompt = user.profile?.aiPrompt;
    const targetSkills = user.profile?.targetSkills;

    return resumeAnalyzer.suggestAutopilot(
      resume.path,
      resume.mimeType,
      customPrompt,
      targetSkills
    );
  }
}

export const userService = new UserService();
