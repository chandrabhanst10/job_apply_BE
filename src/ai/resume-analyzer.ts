import fs from "node:fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { promptService } from "../modules/prompt/prompt.service.js";

export interface ResumeAnalysisResult {
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
  certifications: string[];
  atsScore: number;
  summary: string;
  missingSkills: string[];
  suggestions: string[];
  provider: "gemini" | "local";
  rawProviderResponse?: unknown;
}

export interface ResumeMatchResult {
  matchScore: number;
  missingKeywords: string[];
  suggestions: string[];
  tailoredBulletPoints: string[];
  coverLetter?: string;
  provider: "gemini" | "local";
}

export interface FeedPostClassificationResult {
  isHiring: boolean;
  jobTitle?: string;
  company?: string;
  recruiterName?: string;
  recruiterProfileUrl?: string;
  experience?: string;
  skills?: string[];
  location?: string;
  employmentType?: string;
  salary?: string;
  applicationUrl?: string;
  applicationEmail?: string;
  companyWebsite?: string;
  deadline?: string;
  workplaceType?: "remote" | "hybrid" | "onsite" | "unspecified";
  provider?: "gemini" | "local";
}

export interface FeedOpportunityMatchResult {
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  recommendation: string;
  applicationMethod: "official_link" | "company_careers" | "recruiter_email" | "manual_review";
  provider?: "gemini" | "local";
}

const knownSkills = ["typescript", "javascript", "node.js", "express", "mongodb", "redis", "aws", "docker", "kubernetes", "react", "python", "sql", "graphql", "ci/cd"];

export class ResumeAnalyzer {
  async analyze(filePath: string, mimeType: string, userId?: string): Promise<ResumeAnalysisResult> {
    if (env.GEMINI_API_KEY) {
      try {
        return await this.analyzeWithGemini(filePath, mimeType, userId);
      } catch (error) {
        logger.error({ err: error }, "Gemini analysis failed. Falling back to local parser.");
      }
    }
    return this.analyzeLocally(filePath);
  }

  async match(filePath: string, mimeType: string, jobDescription: string, userId?: string): Promise<ResumeMatchResult> {
    if (env.GEMINI_API_KEY) {
      try {
        return await this.matchWithGemini(filePath, mimeType, jobDescription, userId);
      } catch (error) {
        logger.error({ err: error }, "Gemini match failed. Falling back to local matcher.");
      }
    }
    return this.matchLocally(filePath, jobDescription);
  }

  private async analyzeWithGemini(filePath: string, mimeType: string, userId?: string): Promise<ResumeAnalysisResult> {
    const model = new GoogleGenerativeAI(env.GEMINI_API_KEY as string).getGenerativeModel({ model: env.GEMINI_MODEL });
    const data = await fs.readFile(filePath);
    const prompt = await promptService.getPrompt(userId, "resume_analysis");

    const response = await model.generateContent([
      prompt,
      { inlineData: { data: data.toString("base64"), mimeType } }
    ]);
    const text = response.response.text().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(text) as Omit<ResumeAnalysisResult, "provider" | "rawProviderResponse">;
    return { ...parsed, atsScore: Math.max(0, Math.min(100, Number(parsed.atsScore) || 0)), provider: "gemini", rawProviderResponse: text };
  }

  private async matchWithGemini(filePath: string, mimeType: string, jobDescription: string, userId?: string): Promise<ResumeMatchResult> {
    const model = new GoogleGenerativeAI(env.GEMINI_API_KEY as string).getGenerativeModel({ model: env.GEMINI_MODEL });
    const data = await fs.readFile(filePath);
    const basePrompt = await promptService.getPrompt(userId, "resume_matching");
    const prompt = `${basePrompt}\n\nJob Description to match:\n"${jobDescription}"`;

    const response = await model.generateContent([
      prompt,
      { inlineData: { data: data.toString("base64"), mimeType } }
    ]);
    const text = response.response.text().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(text) as Omit<ResumeMatchResult, "provider">;
    return { 
      ...parsed, 
      matchScore: Math.max(0, Math.min(100, Number(parsed.matchScore) || 0)), 
      provider: "gemini" 
    };
  }

  private async analyzeLocally(filePath: string): Promise<ResumeAnalysisResult> {
    const buffer = await fs.readFile(filePath);
    const text = buffer.toString("utf8").toLowerCase();
    const skills = knownSkills.filter((skill) => text.includes(skill));
    const section = (name: string) => (text.includes(name) ? [`${name[0].toUpperCase()}${name.slice(1)} section detected`] : []);
    const atsScore = Math.min(95, 45 + skills.length * 5 + (text.includes("experience") ? 10 : 0) + (text.includes("education") ? 10 : 0));
    return {
      skills,
      experience: section("experience"),
      education: section("education"),
      projects: section("projects"),
      certifications: section("certifications"),
      atsScore,
      summary: skills.length ? `Resume highlights ${skills.slice(0, 5).join(", ")} with an estimated ATS score of ${atsScore}.` : `Resume uploaded and analyzed with an estimated ATS score of ${atsScore}.`,
      missingSkills: knownSkills.filter((skill) => !skills.includes(skill)).slice(0, 6),
      suggestions: [
        "Add measurable impact for recent roles.",
        "Include a dedicated skills section matching target job descriptions.",
        "Use consistent role, company, and date formatting."
      ],
      provider: "local"
    };
  }

  private async matchLocally(filePath: string, jobDescription: string): Promise<ResumeMatchResult> {
    const buffer = await fs.readFile(filePath);
    const resumeText = buffer.toString("utf8").toLowerCase();
    const jdLower = jobDescription.toLowerCase();
    
    const jdKeywords = knownSkills.filter((skill) => jdLower.includes(skill));
    const resumeKeywords = knownSkills.filter((skill) => resumeText.includes(skill));
    const missingKeywords = jdKeywords.filter((skill) => !resumeKeywords.includes(skill));
    
    const matchingCount = jdKeywords.length - missingKeywords.length;
    const matchScore = jdKeywords.length > 0 
      ? Math.round((matchingCount / jdKeywords.length) * 100) 
      : 50;

    return {
      matchScore,
      missingKeywords,
      suggestions: [
        "Incorporate target keywords naturally in recent job experience sections.",
        "Update your professional summary to mention target technologies found in the JD."
      ],
      tailoredBulletPoints: [
        "Led cross-functional feature development utilizing primary project requirements.",
        "Optimized client-server interfaces resulting in improved application performance."
      ],
      coverLetter: `Dear Hiring Manager,\n\nI am writing to express my interest in the targeted position. Based on my experience and matching core skills, I believe I am well suited to add direct value to your team.\n\nI have successfully executed projects using standard development best practices. I look forward to discussing how my experience can support your team's objectives.\n\nSincerely,\nCandidate`,
      provider: "local"
    };
  }

  async suggestAutopilot(
    filePath: string,
    mimeType: string,
    customPrompt?: string,
    targetSkills?: string[],
    userId?: string
  ): Promise<{ jobTitles: string[]; locations: string[] }> {
    if (env.GEMINI_API_KEY) {
      try {
        return await this.suggestAutopilotWithGemini(filePath, mimeType, customPrompt, targetSkills, userId);
      } catch (error) {
        logger.error({ err: error }, "Gemini autopilot suggest failed. Falling back to local parser.");
      }
    }
    return this.suggestAutopilotLocally(filePath);
  }

  private async suggestAutopilotWithGemini(
    filePath: string,
    mimeType: string,
    customPrompt?: string,
    targetSkills?: string[],
    userId?: string
  ): Promise<{ jobTitles: string[]; locations: string[] }> {
    const model = new GoogleGenerativeAI(env.GEMINI_API_KEY as string).getGenerativeModel({ model: env.GEMINI_MODEL });
    const data = await fs.readFile(filePath);

    let prompt = customPrompt || await promptService.getPrompt(userId, "resume_analysis");

    if (targetSkills && targetSkills.length > 0) {
      prompt += `\n\nAdditionally, prioritize these target skills specified by the candidate: ${targetSkills.join(", ")}.`;
    }

    prompt += `\n\nAnalyze the candidate's technical skills, frameworks, languages, tools, and experience in this resume.
Generate a rich list of 6-8 diverse, highly relevant industry job titles matching their technical background.
For example, if the resume lists React, TypeScript, Node.js, Python, or Java, generate diverse variations such as "React Developer", "ReactJS Developer", "Frontend Engineer", "Node.js Developer", "Node JS Engineer", "Full Stack Developer", "Software Engineer", "Web Application Developer".
Return strict JSON with:
1. jobTitles: array of string (6-8 relevant, common industry job titles generated by AI based on candidate skills)
2. locations: array of string (e.g. ["Remote", "Bangalore"])

Only return JSON block. Do not write anything else.`;

    const response = await model.generateContent([
      prompt,
      { inlineData: { data: data.toString("base64"), mimeType } }
    ]);
    const text = response.response.text().replace(/^```json\s*|\s*```$/g, "");
    return JSON.parse(text) as { jobTitles: string[]; locations: string[] };
  }

  private async suggestAutopilotLocally(filePath: string): Promise<{ jobTitles: string[]; locations: string[] }> {
    const buffer = await fs.readFile(filePath);
    const text = buffer.toString("utf8").toLowerCase();
    
    const jobTitlesSet = new Set<string>();
    
    if (text.includes("react") || text.includes("reactjs") || text.includes("frontend") || text.includes("ui")) {
      jobTitlesSet.add("React Developer");
      jobTitlesSet.add("ReactJS Developer");
      jobTitlesSet.add("Frontend Engineer");
      jobTitlesSet.add("Frontend Developer");
    }
    if (text.includes("node") || text.includes("nodejs") || text.includes("express") || text.includes("backend")) {
      jobTitlesSet.add("Node JS Developer");
      jobTitlesSet.add("Node.js Developer");
      jobTitlesSet.add("Backend Engineer");
      jobTitlesSet.add("Backend Developer");
    }
    if (text.includes("python") || text.includes("django") || text.includes("fastapi")) {
      jobTitlesSet.add("Python Developer");
      jobTitlesSet.add("Python Software Engineer");
    }
    if (text.includes("java") || text.includes("spring")) {
      jobTitlesSet.add("Java Developer");
      jobTitlesSet.add("Java Software Engineer");
    }
    if (jobTitlesSet.size >= 2) {
      jobTitlesSet.add("Full Stack Developer");
      jobTitlesSet.add("Software Engineer");
    } else {
      jobTitlesSet.add("Software Engineer");
      jobTitlesSet.add("Software Developer");
    }
    
    const jobTitles = Array.from(jobTitlesSet);
    const locations: string[] = ["Remote", "Worldwide"];
    
    return { jobTitles, locations };
  }

  async classifyAndExtractFeedPost(postText: string, userId?: string): Promise<FeedPostClassificationResult> {
    if (env.GEMINI_API_KEY) {
      try {
        return await this.classifyAndExtractWithGemini(postText, userId);
      } catch (error) {
        logger.error({ err: error }, "Gemini feed post classification failed. Falling back to local parser.");
      }
    }
    return this.classifyFeedPostLocally(postText);
  }

  private async classifyAndExtractWithGemini(postText: string, userId?: string): Promise<FeedPostClassificationResult> {
    const model = new GoogleGenerativeAI(env.GEMINI_API_KEY as string).getGenerativeModel({ model: env.GEMINI_MODEL });
    const basePrompt = await promptService.getPrompt(userId, "job_classification");
    const prompt = `${basePrompt}\n\nSocial Post Text:\n"${postText.replace(/"/g, '\\"')}"`;

    const response = await model.generateContent(prompt);
    const text = response.response.text().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(text) as FeedPostClassificationResult;
    return {
      isHiring: Boolean(parsed.isHiring),
      jobTitle: parsed.jobTitle || undefined,
      company: parsed.company || undefined,
      recruiterName: parsed.recruiterName || undefined,
      recruiterProfileUrl: parsed.recruiterProfileUrl || undefined,
      experience: parsed.experience || undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      location: parsed.location || undefined,
      employmentType: parsed.employmentType || undefined,
      salary: parsed.salary || undefined,
      applicationUrl: parsed.applicationUrl || undefined,
      applicationEmail: parsed.applicationEmail || undefined,
      companyWebsite: parsed.companyWebsite || undefined,
      deadline: parsed.deadline || undefined,
      workplaceType: ["remote", "hybrid", "onsite"].includes(parsed.workplaceType || "")
        ? parsed.workplaceType
        : "unspecified",
      provider: "gemini"
    };
  }

  private classifyFeedPostLocally(postText: string): FeedPostClassificationResult {
    const lower = postText.toLowerCase();
    const hiringKeywords = ["hiring", "we're hiring", "we are hiring", "job opportunity", "opening for", "looking for", "join our team", "send your resume", "dm me", "apply here", "role:", "position:"];
    const isHiring = hiringKeywords.some((kw) => lower.includes(kw));

    if (!isHiring) {
      return { isHiring: false, provider: "local" };
    }

    const emailMatch = postText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const urlMatch = postText.match(/https?:\/\/[^\s]+/);
    const skills = knownSkills.filter((skill) => lower.includes(skill));

    let workplaceType: "remote" | "hybrid" | "onsite" | "unspecified" = "unspecified";
    if (lower.includes("remote")) workplaceType = "remote";
    else if (lower.includes("hybrid")) workplaceType = "hybrid";
    else if (lower.includes("onsite") || lower.includes("on-site")) workplaceType = "onsite";

    return {
      isHiring: true,
      jobTitle: "Software Developer Opportunity",
      skills,
      applicationEmail: emailMatch ? emailMatch[0] : undefined,
      applicationUrl: urlMatch ? urlMatch[0] : undefined,
      workplaceType,
      provider: "local"
    };
  }

  matchFeedOpportunity(
    candidateSkills: string[],
    opportunity: FeedPostClassificationResult
  ): FeedOpportunityMatchResult {
    const targetSkills = (opportunity.skills || []).map((s) => s.toLowerCase());
    const userSkillsLower = candidateSkills.map((s) => s.toLowerCase());

    const matchingSkills = targetSkills.filter((s) => userSkillsLower.includes(s));
    const missingSkills = targetSkills.filter((s) => !userSkillsLower.includes(s));

    let matchScore = 60;
    if (targetSkills.length > 0) {
      matchScore = Math.round((matchingSkills.length / targetSkills.length) * 100);
    } else if (matchingSkills.length > 0) {
      matchScore = 75;
    }

    let applicationMethod: "official_link" | "company_careers" | "recruiter_email" | "manual_review" = "manual_review";

    if (opportunity.applicationUrl) {
      if (opportunity.applicationUrl.includes("careers") || opportunity.applicationUrl.includes("jobs.")) {
        applicationMethod = "company_careers";
      } else {
        applicationMethod = "official_link";
      }
    } else if (opportunity.applicationEmail) {
      applicationMethod = "recruiter_email";
    } else if (opportunity.companyWebsite) {
      applicationMethod = "company_careers";
    }

    const recommendation = matchScore >= 60
      ? `High candidate skill match (${matchScore}%). Recommended for automated processing via ${applicationMethod}.`
      : `Moderate skill match (${matchScore}%). Review required before submitting application.`;

    return {
      matchScore,
      matchingSkills,
      missingSkills,
      recommendation,
      applicationMethod,
      provider: "local"
    };
  }
}

export const resumeAnalyzer = new ResumeAnalyzer();
