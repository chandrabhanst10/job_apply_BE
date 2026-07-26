import { UserModel } from "../modules/user/model.js";
import { JobApplicationModel } from "../modules/automation/model.js";
import { applyQueue } from "./apply.queue.js";
import { connectionService } from "../modules/connections/service.js";
import { chromium } from "playwright";
import { ResumeModel } from "../modules/resume/model.js";
import { notificationService } from "../modules/notification/service.js";
import { resumeAnalyzer } from "../ai/resume-analyzer.js";

export async function runAutopilotCrawl(): Promise<void> {
  console.log("[Autopilot Scraper] Starting periodic job crawl...");

  // 1. Find all active users with autopilot enabled on at least one platform
  const users = await UserModel.find({
    $or: [
      { "autopilot.linkedin.enabled": true },
      { "autopilot.naukri.enabled": true }
    ],
    isDeleted: false
  }).exec();

  if (users.length === 0) {
    console.log("[Autopilot Scraper] No users with autopilot enabled. Sleeping.");
    return;
  }

  // 2. Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  try {
    for (const user of users) {
      const userId = user._id.toString();

      // Find the user's primary/recent resume to apply with
      const primaryResume = await ResumeModel.findOne({ userId }).sort({ createdAt: -1 }).exec();
      if (!primaryResume) {
        console.warn(`[Autopilot Scraper] User ${userId} has no resumes uploaded. Skipping crawl.`);
        continue;
      }
      const resumeId = primaryResume._id.toString();

      // Check connected and enabled platforms
      const platforms: ("linkedin" | "naukri")[] = [];
      if (user.connections?.linkedin?.isConnected && user.autopilot?.linkedin?.enabled) {
        platforms.push("linkedin");
      }
      if (user.connections?.naukri?.isConnected && user.autopilot?.naukri?.enabled) {
        platforms.push("naukri");
      }

      for (const platform of platforms) {
        const platConfig = user.autopilot?.[platform];
        const rawJobTitles = platConfig?.jobTitles || [];
        const rawLocations = platConfig?.locations || ["worldwide"];

        let jobTitles = rawJobTitles;
        if (jobTitles.length === 0 && primaryResume) {
          const suggestions = await resumeAnalyzer.suggestAutopilot(
            primaryResume.path,
            primaryResume.mimeType,
            undefined,
            user.profile?.targetSkills,
            userId
          );
          jobTitles = suggestions.jobTitles;
        }

        if (jobTitles.length === 0) continue;

        // Format locations nicely for LinkedIn (replace "worldwide" with "Worldwide" or empty)
        const locations = rawLocations.map((l: string) => l.toLowerCase() === "worldwide" ? "Worldwide" : l);

        console.log(`[Autopilot Scraper] Crawling ${platform} for user ${user.email}`);
        notificationService.send(userId, "job_crawler_status", { platform, status: "started" });

        // Get decrypted cookies
        let cookies;
        try {
          cookies = await connectionService.getDecryptedCookies(userId, platform);
        } catch {
          console.warn(`[Autopilot Scraper] Failed to decrypt cookies for user ${userId} on ${platform}. Skipping.`);
          continue;
        }

        const context = await browser.newContext({
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        });

        // Set cookies
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
        const playwrightCookies = (cookies as CookieItem[]).map((c: CookieItem) => ({
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

        for (const title of jobTitles) {
          for (const loc of locations) {
            try {
              if (platform === "linkedin") {
                // Search LinkedIn Easy Apply first, fallback to broad search
                const locQuery = loc && loc !== "Worldwide" ? `&location=${encodeURIComponent(loc)}` : "";
                const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}${locQuery}&f_AL=true`;
                await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 35000 });
                await page.waitForTimeout(3000);
                
                // Save debug screenshot
                try {
                  await page.screenshot({ path: "uploads/linkedin_search_debug.png" });
                } catch (screenshotErr) {
                  console.error("[Autopilot Scraper] Failed to save screenshot:", screenshotErr);
                }

                // Scrape job links with multiple flexible CSS selectors
                let jobLinks = await page.$$eval(
                  "a.job-card-list__title, a.job-card-container__link, a.base-card__full-link, a[href*='/jobs/view/']",
                  (links) => {
                    return links
                      .map((l) => (l as HTMLAnchorElement).href)
                      .filter((href) => href && href.includes("/jobs/view/"))
                      .slice(0, 10);
                  }
                );

                // If Easy Apply returned 0 links, try broad search without f_AL filter
                if (jobLinks.length === 0) {
                  const fallbackUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}${locQuery}`;
                  await page.goto(fallbackUrl, { waitUntil: "domcontentloaded", timeout: 35000 });
                  await page.waitForTimeout(3000);
                  jobLinks = await page.$$eval(
                    "a.job-card-list__title, a.job-card-container__link, a.base-card__full-link, a[href*='/jobs/view/']",
                    (links) => {
                      return links
                        .map((l) => (l as HTMLAnchorElement).href)
                        .filter((href) => href && href.includes("/jobs/view/"))
                        .slice(0, 10);
                    }
                  );
                }

                // Clean and deduplicate links
                const uniqueLinks = Array.from(new Set(jobLinks.map(link => {
                  const urlObj = new URL(link);
                  return `${urlObj.origin}${urlObj.pathname}`;
                })));

                console.log(`[Autopilot Scraper] Found ${uniqueLinks.length} job links for "${title}"`);

                for (const jobUrl of uniqueLinks) {
                  const exists = await JobApplicationModel.findOne({ userId, jobUrl }).exec();
                  if (!exists) {
                    const app = await JobApplicationModel.create({
                      userId,
                      platform: "linkedin",
                      jobUrl,
                      status: "applied",
                      appliedAt: new Date()
                    });
                    notificationService.send(userId, "job_application_status", {
                      applicationId: app._id.toString(),
                      status: "applied",
                      platform: "linkedin",
                      jobUrl
                    });

                    await applyQueue.add(`autopilot-apply-${app._id}`, {
                      userId,
                      applicationId: app._id.toString(),
                      platform: "linkedin",
                      jobUrl,
                      resumeId
                    });
                    console.log(`[Autopilot Scraper] Created & Applied job: ${jobUrl}`);
                  }
                }
              } else if (platform === "naukri") {
                const querySlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                const locSlug = loc && loc !== "Worldwide" ? `-jobs-in-${loc.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "-jobs";
                const searchUrl = `https://www.naukri.com/${querySlug}${locSlug}`;
                await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 35000 });
                await page.waitForTimeout(3000);

                const jobLinks = await page.$$eval("a.title, a[href*='naukri.com/job-listings']", (links) => {
                  return links
                    .map((l) => (l as HTMLAnchorElement).href)
                    .filter((href) => href && href.includes("naukri.com/job-listings"))
                    .slice(0, 10);
                });

                for (const jobUrl of jobLinks) {
                  const exists = await JobApplicationModel.findOne({ userId, jobUrl }).exec();
                  if (!exists) {
                    const app = await JobApplicationModel.create({
                      userId,
                      platform: "naukri",
                      jobUrl,
                      status: "applied",
                      appliedAt: new Date()
                    });
                    notificationService.send(userId, "job_application_status", {
                      applicationId: app._id.toString(),
                      status: "applied",
                      platform: "naukri",
                      jobUrl
                    });

                    await applyQueue.add(`autopilot-apply-${app._id}`, {
                      userId,
                      applicationId: app._id.toString(),
                      platform: "naukri",
                      jobUrl,
                      resumeId
                    });
                    console.log(`[Autopilot Scraper] Created & Applied Naukri job: ${jobUrl}`);
                  }
                }
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              console.error(`[Autopilot Scraper] Error during crawl for user ${user.email} (${title} in ${loc}): ${msg}`);
              notificationService.send(userId, "job_crawler_status", { platform, status: "failed", error: msg });
            }
          }
        }

        await context.close();
        notificationService.send(userId, "job_crawler_status", { platform, status: "completed" });

        await UserModel.updateOne(
          { _id: user._id },
          { $set: { [`autopilot.${platform}.lastRunAt`]: new Date() } }
        );
      }
    }
  } finally {
    await browser.close();
    console.log("[Autopilot Scraper] Crawl cycle complete.");
  }
}
