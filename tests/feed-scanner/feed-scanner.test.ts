import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerAndLogin } from "../helpers.js";
import { resumeAnalyzer } from "../../src/ai/resume-analyzer.js";

describe("AI Smart Feed Scanner Module", () => {
  it("should classify hiring posts and extract structured information", async () => {
    const postText = "We are hiring a Senior React Developer in Bangalore! Skills required: React, TypeScript, Node.js. Apply at https://example.com/careers or send resume to hiring@example.com";
    const result = await resumeAnalyzer.classifyAndExtractFeedPost(postText);

    expect(result.isHiring).toBe(true);
    expect(result.skills).toContain("react");
    expect(result.skills).toContain("typescript");
    expect(result.applicationEmail).toBe("hiring@example.com");
    expect(result.applicationUrl).toBe("https://example.com/careers");
  });

  it("should ignore non-hiring social posts", async () => {
    const postText = "Just attended an amazing tech conference on web performance and AI agents! Thanks to all speakers.";
    const result = await resumeAnalyzer.classifyAndExtractFeedPost(postText);

    expect(result.isHiring).toBe(false);
  });

  it("should correctly compute match scores for feed opportunities", () => {
    const candidateSkills = ["react", "typescript", "node.js", "mongodb"];
    const opportunity = {
      isHiring: true,
      jobTitle: "React Developer",
      skills: ["react", "typescript"],
      applicationUrl: "https://example.com/apply"
    };

    const matchResult = resumeAnalyzer.matchFeedOpportunity(candidateSkills, opportunity);
    expect(matchResult.matchScore).toBeGreaterThanOrEqual(60);
    expect(matchResult.applicationMethod).toBe("official_link");
  });

  it("should require authentication for feed-scanner endpoints", async () => {
    const res = await request(app).get("/api/v1/feed-scanner/opportunities");
    expect(res.status).toBe(401);
  });

  it("should allow authenticated users to fetch feed opportunities and update settings", async () => {
    const { accessToken } = await registerAndLogin("feeduser@example.com");

    const getRes = await request(app)
      .get("/api/v1/feed-scanner/opportunities")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(Array.isArray(getRes.body.data.data)).toBe(true);

    const updateRes = await request(app)
      .patch("/api/v1/feed-scanner/settings")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ feedScanEnabled: true, minMatchScore: 70 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.feedScanEnabled).toBe(true);
    expect(updateRes.body.data.minMatchScore).toBe(70);
  });
});
