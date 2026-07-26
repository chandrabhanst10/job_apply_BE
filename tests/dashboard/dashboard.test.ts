import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerAndLogin } from "../helpers.js";

describe("dashboard module", () => {
  it("returns dashboard summary for an authenticated user", async () => {
    const { accessToken } = await registerAndLogin("dashboard@example.com");
    const response = await request(app).get("/api/v1/dashboard/summary").set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.totalResumes).toBe(0);
    expect(response.body.data.recentActivity.length).toBeGreaterThan(0);
  });
});
