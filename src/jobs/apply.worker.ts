import { Worker, type Job } from "bullmq";
import { chromium } from "playwright";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { notificationService } from "../modules/notification/service.js";
import { connectionService } from "../modules/connections/service.js";
import { JobApplicationModel } from "../modules/automation/model.js";
import { UserModel } from "../modules/user/model.js";
import { ResumeModel } from "../modules/resume/model.js";
import { ResumeAnalysisModel } from "../modules/resume/analysis.model.js";
import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";

export interface ApplyJobData {
  userId: string;
  applicationId: string;
  platform: "linkedin" | "naukri";
  jobUrl: string;
  resumeId: string;
}

async function downloadResume(url: string, filename: string): Promise<string> {
  if (url.startsWith("http")) {
    const tempDir = path.resolve(env.UPLOAD_DIR);
    await fs.mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `temp-${Date.now()}-${filename}`);
    const response = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer"
    });
    await fs.writeFile(tempPath, Buffer.from(response.data as ArrayBuffer));
    return tempPath;
  }
  return path.resolve(url);
}

async function answerScreeningQuestion(
  question: string,
  resumeSummary: string,
  skills: string[],
  experience: string[]
): Promise<string> {
  if (!env.GEMINI_API_KEY) return "";
  try {
    const ai = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: env.GEMINI_MODEL });
    const prompt = `
You are a job applicant. Answer the following screening question briefly and professionally.
Use the applicant's resume summary, skills, and experience to formulate the answer.
Question: "${question}"
Resume Summary: "${resumeSummary}"
Skills: ${skills.join(", ")}
Experience: ${experience.join("; ")}
Return ONLY the direct answer text. Do not write introductory words or explanations. Keep it concise (1-3 sentences or a simple number if requested).
`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return "";
  }
}

export const applyWorker = new Worker<ApplyJobData>(
  "job-applications",
  async (job: Job<ApplyJobData>) => {
    const { userId, applicationId, platform, jobUrl, resumeId } = job.data;
    console.log(`[Worker] Started processing Job Application ${applicationId}`);

    // Update status to applying
    await JobApplicationModel.updateOne({ _id: applicationId }, { $set: { status: "applying" } });
    notificationService.send(userId, "job_application_status", {
      applicationId,
      status: "applying",
      platform,
      jobUrl
    });

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const resume = await ResumeModel.findById(resumeId);
    if (!resume) {
      throw new Error("Resume not found");
    }

    const analysis = await ResumeAnalysisModel.findOne({ resumeId });
    const profile = user.profile;

    let localResumePath = "";
    try {
      localResumePath = await downloadResume(resume.path, resume.originalName);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to download resume file: ${errMsg}`);
    }

    const rawCookies = await connectionService.getDecryptedCookies(userId, platform);

    // Launch Playwright Headless Browser
    const browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"]
    });

    try {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      });

      interface CookieItem {
        name: string;
        value: string;
        domain: string;
        path?: string;
        expires?: number;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: string;
      }
      const playwrightCookies = (rawCookies as CookieItem[]).map((c: CookieItem) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || "/",
        expires: c.expires || -1,
        httpOnly: c.httpOnly || false,
        secure: c.secure || false,
        sameSite: (c.sameSite as "Lax" | "None" | "Strict") || "Lax"
      }));
      await context.addCookies(playwrightCookies);

      const page = await context.newPage();

      await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

      if (platform === "linkedin") {
        // LinkedIn Easy Apply Flow
        const applyBtn = await page.$("button.jobs-apply-button");
        if (!applyBtn) {
          throw new Error("LinkedIn Easy Apply button not found or already applied.");
        }
        await applyBtn.click();
        await page.waitForTimeout(2000);

        let attempts = 0;
        let isApplied = false;

        while (attempts < 10) {
          attempts++;

          // Upload resume file
          const fileInput = await page.$("input[type='file']");
          if (fileInput) {
            await fileInput.setInputFiles(localResumePath);
            await page.waitForTimeout(1000);
          }

          // Input form filling
          const textInputs = await page.$$("input[type='text'], textarea");
          for (const input of textInputs) {
            const id = await input.getAttribute("id").catch(() => "") || "";
            const name = await input.getAttribute("name").catch(() => "") || "";
            const labelText = await page.locator(`label[for='${id}']`).innerText().catch(() => "") || "";

            const combinedLabel = `${labelText} ${name} ${id}`.toLowerCase();
            const currentValue = await input.evaluate((el) => (el as HTMLInputElement).value);

            if (!currentValue) {
              if (combinedLabel.includes("name") || combinedLabel.includes("first")) {
                await input.fill(profile.name);
              } else if (combinedLabel.includes("phone") || combinedLabel.includes("mobile")) {
                await input.fill(profile.mobile || "0000000000");
              } else if (combinedLabel.includes("city") || combinedLabel.includes("location")) {
                await input.fill(profile.city || "");
              } else {
                // Generate screening answer via AI
                const summary = analysis?.summary || "";
                const skills = analysis?.skills || [];
                const exp = analysis?.experience || [];
                const answer = await answerScreeningQuestion(labelText || id, summary, skills, exp);
                if (answer) {
                  await input.fill(answer);
                }
              }
            }
          }

          // Submit or Next button
          const submitBtn = await page.$("button[aria-label='Submit application']");
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForTimeout(3000);
            isApplied = true;
            break;
          }

          const nextBtn = await page.$("button[aria-label='Continue to next step']");
          if (nextBtn) {
            await nextBtn.click();
            await page.waitForTimeout(2000);
          } else {
            break;
          }
        }

        if (!isApplied) {
          throw new Error("LinkedIn application path did not complete or requires manual selection.");
        }

      } else if (platform === "naukri") {
        // Naukri Application Flow
        const applyBtn = await page.$("#apply-button, .apply-button, button:has-text('Apply')");
        if (!applyBtn) {
          throw new Error("Naukri Apply button not found.");
        }
        await applyBtn.click();
        await page.waitForTimeout(4000);
      }

      // Success updates
      await JobApplicationModel.updateOne(
        { _id: applicationId },
        { $set: { status: "applied", appliedAt: new Date() } }
      );

      notificationService.send(userId, "job_application_status", {
        applicationId,
        status: "applied",
        platform,
        jobUrl
      });

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await JobApplicationModel.updateOne(
        { _id: applicationId },
        { $set: { status: "failed", error: errMsg } }
      );
      notificationService.send(userId, "job_application_status", {
        applicationId,
        status: "failed",
        error: errMsg,
        platform,
        jobUrl
      });
      throw err;
    } finally {
      await browser.close();
      if (localResumePath.includes("temp-")) {
        await fs.unlink(localResumePath).catch(() => {});
      }
    }
  },
  {
    connection: { url: env.REDIS_URL || "redis://localhost:6379" }
  }
);

let lastWorkerErrorLoggedAt = 0;
applyWorker.on("error", (err) => {
  const now = Date.now();
  if (now - lastWorkerErrorLoggedAt > 30000) {
    console.warn(`[Worker Warning] Redis connection issue: ${err.message}. Retrying...`);
    lastWorkerErrorLoggedAt = now;
  }
});
