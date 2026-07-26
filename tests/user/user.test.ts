import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerAndLogin } from "../helpers.js";

describe("user module", () => {
  it("retrieves, updates, and deletes a profile", async () => {
    const { accessToken } = await registerAndLogin("profile@example.com");

    const profile = await request(app).get("/api/v1/users/profile").set("Authorization", `Bearer ${accessToken}`);
    expect(profile.status).toBe(200);
    expect(profile.body.data.profile.name).toBe("Test User");

    const updated = await request(app)
      .patch("/api/v1/users/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ city: "Bengaluru", country: "India", github: "https://github.com/example" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.profile.city).toBe("Bengaluru");

    const deleted = await request(app).delete("/api/v1/users/profile").set("Authorization", `Bearer ${accessToken}`);
    expect(deleted.status).toBe(200);
  });
});
