import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();

export async function registerAndLogin(email = "user@example.com") {
  const password = "Password123";
  const res = await request(app).post("/api/v1/auth/register").send({ name: "Test User", email, password });
  return { accessToken: res.body.data.accessToken as string, refreshToken: res.body.data.refreshToken as string, password, user: res.body.data.user };
}
