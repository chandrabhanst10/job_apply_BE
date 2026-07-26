import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../helpers.js";

describe("middleware, validation, and errors", () => {
  it("returns standardized 404 responses", async () => {
    const response = await request(app).get("/missing-route");
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, data: null });
  });

  it("rejects protected routes without authentication", async () => {
    const response = await request(app).get("/api/v1/users/profile");
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
