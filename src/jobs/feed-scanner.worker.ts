import { chromium } from "playwright";
import { UserModel } from "../modules/user/model.js";
import { ResumeModel } from "../modules/resume/model.js";
import { ResumeAnalysisModel } from "../modules/resume/analysis.model.js";
import {
  createFeedPost,
  createFeedOpportunity,
  findFeedPostByPostId,
  findFeedOpportunityByDedupHash,
  updateFeedOpportunityStatus
} from "../modules/feed-scanner/core/index.js";
import { connectionService } from "../modules/connections/service.js";
import { notificationService } from "../modules/notification/service.js";
import { auditService } from "../modules/audit/service.js";
import { resumeAnalyzer } from "../ai/resume-analyzer.js";
import { sha256 } from "../utils/crypto.js";
import { applyQueue } from "./apply.queue.js";

export async function runFeedScannerCrawl(): Promise<void> {
  console.log("[Feed Scanner] Starting periodic social feed scan...");

  // Match users with connected LinkedIn session AND autopilot enabled OR feedScanEnabled
  const users = await UserModel.find({
    "connections.linkedin.isConnected": true,
    $or: [
      { "autopilot.linkedin.enabled": true },
      { "autopilot.linkedin.feedScanEnabled": true }
    ],
    isDeleted: false
  }).exec();

  if (users.length === 0) {
    console.log("[Feed Scanner] No active users with connected LinkedIn. Sleeping.");
    return;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  try {
    for (const user of users) {
      const userId = user._id.toString();
      console.log(`[Feed Scanner] Scanning LinkedIn feed for user: ${user.email}`);
      notificationService.send(userId, "feed_scanner_status", { status: "started", platform: "linkedin" });

      let rawCookies;
      try {
        rawCookies = await connectionService.getDecryptedCookies(userId, "linkedin");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Feed Scanner] Could not decrypt cookies for ${user.email}: ${msg}`);
        continue;
      }

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

      try {
        await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 35000 });
        await page.waitForTimeout(4000);

        // Scroll to load feed posts
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 1000));
          await page.waitForTimeout(2000);
        }

        // Extract posts
        const scrapedPosts = await page.$$eval(
          "div.feed-shared-update-v2, div.occludable-update, div[data-urn], div.feed-shared-update-v2__control-menu",
          (containers) => {
            return containers.slice(0, 15).map((el, index) => {
              const urn = el.getAttribute("data-urn") || `post-${Date.now()}-${index}`;
              const textEl = el.querySelector(".feed-shared-update-v2__description, .update-components-text, .feed-shared-inline-show-more-text");
              const postText = textEl ? (textEl as HTMLElement).innerText.trim() : "";
              
              const authorEl = el.querySelector(".update-components-actor__title, .feed-shared-actor__title");
              const authorName = authorEl ? (authorEl as HTMLElement).innerText.split("\n")[0].trim() : "";
              
              const authorLinkEl = el.querySelector("a.update-components-actor__image, a.app-aware-link");
              const authorUrl = authorLinkEl ? (authorLinkEl as HTMLAnchorElement).href : "";
              
              const postLinkEl = el.querySelector("a[href*='/feed/update/']");
              const postUrl = postLinkEl ? (postLinkEl as HTMLAnchorElement).href : `https://www.linkedin.com/feed/update/${urn}`;

              return { postId: urn, postUrl, authorName, authorUrl, postText };
            }).filter((p) => p.postText.length > 20);
          }
        );

        console.log(`[Feed Scanner] Extracted ${scrapedPosts.length} posts for ${user.email}`);

        // Resolve candidate skills from latest resume analysis or profile
        const primaryResume = await ResumeModel.findOne({ userId }).sort({ createdAt: -1 }).exec();
        let candidateSkills = user.profile?.targetSkills || [];
        if (primaryResume) {
          const analysis = await ResumeAnalysisModel.findOne({ resumeId: primaryResume._id }).exec();
          if (analysis?.skills?.length) {
            candidateSkills = Array.from(new Set([...candidateSkills, ...analysis.skills]));
          }
        }

        const minScoreThreshold = user.autopilot?.linkedin?.minMatchScore ?? 50;

        for (const post of scrapedPosts) {
          const existingPost = await findFeedPostByPostId(userId, post.postId);
          if (existingPost) continue;

          const classification = await resumeAnalyzer.classifyAndExtractFeedPost(post.postText);

          const feedPost = await createFeedPost({
            userId,
            platform: "linkedin",
            postId: post.postId,
            postUrl: post.postUrl,
            authorName: post.authorName,
            authorUrl: post.authorUrl,
            postText: post.postText,
            isHiring: classification.isHiring,
            processedAt: new Date()
          });

          if (!classification.isHiring) continue;

          const compStr = (classification.company || "unknown").toLowerCase();
          const titleStr = (classification.jobTitle || "opportunity").toLowerCase();
          const textSnippet = post.postText.slice(0, 100).toLowerCase();
          const dedupHash = sha256(`${compStr}-${titleStr}-${textSnippet}`);

          const existingOpp = await findFeedOpportunityByDedupHash(userId, dedupHash);
          if (existingOpp) continue;

          const matchResult = resumeAnalyzer.matchFeedOpportunity(candidateSkills, classification);

          let initialStatus: "discovered" | "matched" | "queued" | "applied" | "manual_review" | "ignored" = "applied";

          if (matchResult.matchScore < minScoreThreshold) {
            initialStatus = "ignored";
          } else if (matchResult.applicationMethod === "manual_review") {
            initialStatus = "manual_review";
          }

          const opp = await createFeedOpportunity({
            userId,
            feedPostId: feedPost._id,
            platform: "linkedin",
            jobTitle: classification.jobTitle || "Job Opportunity",
            company: classification.company,
            recruiter: {
              name: classification.recruiterName || post.authorName,
              profileUrl: classification.recruiterProfileUrl || post.authorUrl
            },
            experience: classification.experience,
            skills: classification.skills,
            location: classification.location,
            employmentType: classification.employmentType,
            salary: classification.salary,
            applicationUrl: classification.applicationUrl,
            applicationEmail: classification.applicationEmail,
            companyWebsite: classification.companyWebsite,
            workplaceType: classification.workplaceType,
            dedupHash,
            matchScore: matchResult.matchScore,
            matchingSkills: matchResult.matchingSkills,
            missingSkills: matchResult.missingSkills,
            recommendation: matchResult.recommendation,
            applicationMethod: matchResult.applicationMethod,
            status: initialStatus
          });

          if (initialStatus === "applied" && primaryResume) {
            await updateFeedOpportunityStatus(opp._id.toString(), "applied");
            if (classification.applicationUrl) {
              await applyQueue.add(`feed-apply-${opp._id}`, {
                userId,
                applicationId: opp._id.toString(),
                platform: "linkedin",
                jobUrl: classification.applicationUrl,
                resumeId: primaryResume._id.toString()
              });
            }
          }

          notificationService.send(userId, "feed_opportunity_discovered", {
            opportunityId: opp._id.toString(),
            jobTitle: opp.jobTitle,
            company: opp.company,
            matchScore: opp.matchScore,
            applicationMethod: opp.applicationMethod,
            status: opp.status
          });

          await auditService.record({
            userId,
            action: "feed_scanner.opportunity_extracted",
            resource: "feed_opportunity",
            resourceId: opp._id.toString(),
            metadata: {
              matchScore: opp.matchScore,
              applicationMethod: opp.applicationMethod,
              isHiring: classification.isHiring
            }
          });
        }

        await context.close();
        notificationService.send(userId, "feed_scanner_status", { status: "completed", platform: "linkedin" });
      } catch (err: unknown) {
        await context.close();
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Feed Scanner] Error scanning feed for ${user.email}: ${msg}`);
        notificationService.send(userId, "feed_scanner_status", { status: "failed", error: msg, platform: "linkedin" });
      }
    }
  } finally {
    await browser.close();
    console.log("[Feed Scanner] Feed scanning cycle complete.");
  }
}
