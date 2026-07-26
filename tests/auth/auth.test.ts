import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../helpers.js";

describe("auth module", () => {
  it("registers, logs in, refreshes, returns current user, and logs out", async () => {
    const register = await request(app).post("/api/v1/auth/register").send({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "Password123"
    });
    expect(register.status).toBe(201);
    expect(register.body.success).toBe(true);
    expect(register.body.data.accessToken).toBeTruthy();
    expect(register.body.data.refreshToken).toBeTruthy();

    const login = await request(app).post("/api/v1/auth/login").send({ email: "jane@example.com", password: "Password123" });
    expect(login.status).toBe(200);

    const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${login.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe("jane@example.com");

    const refresh = await request(app).post("/api/v1/auth/refresh-token").send({ refreshToken: login.body.data.refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.refreshToken).not.toBe(login.body.data.refreshToken);

    const logout = await request(app).post("/api/v1/auth/logout").set("Authorization", `Bearer ${refresh.body.data.accessToken}`).send({ refreshToken: refresh.body.data.refreshToken });
    expect(logout.status).toBe(200);
  });

  it("rejects duplicate registration and weak input", async () => {
    await request(app).post("/api/v1/auth/register").send({ name: "Jane Doe", email: "jane@example.com", password: "Password123" });
    const duplicate = await request(app).post("/api/v1/auth/register").send({ name: "Jane Doe", email: "jane@example.com", password: "Password123" });
    expect(duplicate.status).toBe(409);

    const weak = await request(app).post("/api/v1/auth/register").send({ name: "J", email: "bad", password: "weak" });
    expect(weak.status).toBe(400);
  });
});
