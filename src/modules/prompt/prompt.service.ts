import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import {
  upsertInitialDefaultPrompts,
  findUserPromptOverride,
  findDefaultPrompt,
  findAllActiveDefaultPrompts,
  findAllUserPromptOverrides,
  updateUserPromptOverride,
  deleteUserPromptOverride
} from "./core/index.js";

export const INITIAL_DEFAULT_PROMPTS = [
  {
    promptKey: "resume_analysis",
    name: "Resume Analysis",
    category: "Resume Processing",
    description: "Extract structured technical skills, experience level, ATS score %, and top target job titles from candidate resume.",
    defaultPrompt: `Analyze this resume for ATS readiness. Return strict JSON with skills, experience, education, projects, certifications, atsScore, summary, missingSkills, suggestions.`,
    version: 1
  },
  {
    promptKey: "resume_matching",
    name: "Resume Matching",
    category: "Job Matching",
    description: "Compare candidate resume against job requirements to calculate match score %, matching skills, missing skills, and cover letter.",
    defaultPrompt: `Analyze this resume against the targeted job description. Return a strict JSON response containing:
1. matchScore: number (0-100) representing compatibility.
2. missingKeywords: array of string representing important keywords/skills from the Job Description that are absent or poorly described in the resume.
3. suggestions: array of string representing clear ways to edit the resume to better match.
4. tailoredBulletPoints: array of string representing 3-5 improved, high-impact resume bullet points rewritten specifically to showcase matching skills for this job description.
5. coverLetter: string representing a professional, 3-4 paragraph cover letter customized to match the job description based on the resume's experience and skills.`,
    version: 1
  },
  {
    promptKey: "job_extraction",
    name: "Job Extraction",
    category: "Feed Scanning",
    description: "Extract job title, company, recruiter profile, required skills, and direct application URL from social feed posts.",
    defaultPrompt: `Extract job title, company name, recruiter profile URL, required skills, experience, and direct application link from this social feed post. Return strict JSON.`,
    version: 1
  },
  {
    promptKey: "job_classification",
    name: "Job Classification",
    category: "Feed Scanning",
    description: "Classify whether a raw social post is an active hiring post or general post.",
    defaultPrompt: `Analyze this social post to detect if it is a job hiring opportunity. Return strict JSON with isHiring (boolean), jobTitle, company, recruiterName, skills, location, employmentType, salary, applicationUrl, applicationEmail, workplaceType.`,
    version: 1
  },
  {
    promptKey: "cover_letter",
    name: "Cover Letter Generation",
    category: "Application Execution",
    description: "Generate a tailored 3-paragraph professional cover letter for the job opening.",
    defaultPrompt: `Generate a concise, professional, 3-paragraph cover letter customized to match the target position based on candidate background.`,
    version: 1
  },
  {
    promptKey: "ats_analysis",
    name: "ATS Analysis",
    category: "Resume Processing",
    description: "Perform deep ATS optimization keyword analysis and return ATS score %.",
    defaultPrompt: `Evaluate ATS keyword optimization score (0-100%) and missing key terms for this candidate resume.`,
    version: 1
  },
  {
    promptKey: "job_summary",
    name: "Job Summary",
    category: "Job Matching",
    description: "Summarize key responsibilities, required skills, and compensation details.",
    defaultPrompt: `Summarize key responsibilities, required skills, and salary expectations for this job posting in bullet points.`,
    version: 1
  },
  {
    promptKey: "skill_extraction",
    name: "Skills Extraction",
    category: "Resume Processing",
    description: "Extract technical and soft skills mentioned in any text snippet.",
    defaultPrompt: `Extract all technical and soft skills mentioned in this text as a clean JSON array of strings.`,
    version: 1
  },
  {
    promptKey: "ai_recommendation",
    name: "AI Recommendation",
    category: "Job Matching",
    description: "Provide actionable recommendation on whether candidate should apply.",
    defaultPrompt: `Provide an actionable recommendation on whether the candidate should apply to this job posting based on skill compatibility.`,
    version: 1
  },
  {
    promptKey: "duplicate_detection",
    name: "Duplicate Detection",
    category: "Feed Scanning",
    description: "Determine whether two job postings represent identical duplicate listings.",
    defaultPrompt: `Determine if these two job descriptions represent duplicate job opportunities. Return strict JSON boolean isDuplicate.`,
    version: 1
  },
  {
    promptKey: "application_decision",
    name: "Application Decision",
    category: "Application Execution",
    description: "Generate explainable reasoning for applying or skipping jobs.",
    defaultPrompt: `Explain why AI decided to apply to or skip this job based on candidate preferences, ATS match score, and required skills.`,
    version: 1
  },
  {
    promptKey: "followup_message",
    name: "Follow-up Messages",
    category: "Application Execution",
    description: "Draft professional recruiter outreach or follow-up messages.",
    defaultPrompt: `Draft a professional recruiter follow-up message expressing interest in this position.`,
    version: 1
  }
];

export class PromptService {
  /**
   * Seed default prompt templates into DB on application startup
   */
  async seedDefaultPrompts(): Promise<void> {
    try {
      await upsertInitialDefaultPrompts(INITIAL_DEFAULT_PROMPTS);
      logger.info("[PromptService] Default prompt templates initialized.");
    } catch (err) {
      logger.error({ err }, "[PromptService] Failed to seed default prompt templates.");
    }
  }

  /**
   * Central Prompt Resolution Engine:
   * 1. Check if user has an active UserPromptOverride
   * 2. If found & isCustomized === true, return customPrompt
   * 3. Else, return DefaultPrompt text
   */
  async getPrompt(userId: string | undefined, promptKey: string): Promise<string> {
    if (userId) {
      const override = await findUserPromptOverride(userId, promptKey);
      if (override && override.customPrompt) {
        return override.customPrompt;
      }
    }

    const defaultPromptDoc = await findDefaultPrompt(promptKey);
    if (defaultPromptDoc && defaultPromptDoc.defaultPrompt) {
      return defaultPromptDoc.defaultPrompt;
    }

    // Fallback to static array if DB query fails
    const staticItem = INITIAL_DEFAULT_PROMPTS.find((p) => p.promptKey === promptKey);
    return staticItem ? staticItem.defaultPrompt : "Analyze and process input data accurately.";
  }

  /**
   * Get list of all prompts for UI with customization status
   */
  async getAllPromptsForUser(userId: string) {
    await this.seedDefaultPrompts();

    const [defaults, overrides] = await Promise.all([
      findAllActiveDefaultPrompts(),
      findAllUserPromptOverrides(userId)
    ]);

    const overrideMap = new Map(overrides.map((o) => [o.promptKey, o]));

    return defaults.map((d) => {
      const userOverride = overrideMap.get(d.promptKey);
      const isCustomized = Boolean(userOverride && userOverride.isCustomized);

      return {
        promptKey: d.promptKey,
        name: d.name,
        category: d.category,
        description: d.description,
        defaultPrompt: d.defaultPrompt,
        currentPrompt: isCustomized ? userOverride!.customPrompt : d.defaultPrompt,
        version: d.version,
        isCustomized,
        updatedAt: isCustomized && userOverride?.updatedAt
          ? userOverride.updatedAt.toISOString()
          : d.updatedAt ? d.updatedAt.toISOString() : new Date().toISOString()
      };
    });
  }

  /**
   * Save user prompt override
   */
  async saveUserOverride(userId: string, promptKey: string, customPrompt: string) {
    const updated = await updateUserPromptOverride(userId, promptKey, customPrompt);
    return updated;
  }

  /**
   * Reset user prompt override back to default
   */
  async resetUserOverride(userId: string, promptKey: string) {
    await deleteUserPromptOverride(userId, promptKey);
    const defaultDoc = await findDefaultPrompt(promptKey);
    return {
      promptKey,
      isCustomized: false,
      currentPrompt: defaultDoc?.defaultPrompt || ""
    };
  }

  /**
   * Test prompt execution against Gemini AI
   */
  async testPrompt(promptText: string, sampleInput: string) {
    if (!env.GEMINI_API_KEY) {
      return { output: `[Simulated Gemini AI Output]:\nBased on your prompt instruction:\n"${promptText}"\n\nAnalyzed sample input:\n"${sampleInput}"\n\nResult: Test execution successful.` };
    }

    try {
      const ai = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = ai.getGenerativeModel({ model: env.GEMINI_MODEL || "gemini-1.5-flash" });
      const fullPrompt = `${promptText}\n\nSample Input Data:\n${sampleInput}`;
      const result = await model.generateContent(fullPrompt);
      return { output: result.response.text().trim() };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { output: `Prompt Test Execution Note: ${errMsg}\n\nProcessed Prompt:\n"${promptText}"` };
    }
  }
}

export const promptService = new PromptService();
