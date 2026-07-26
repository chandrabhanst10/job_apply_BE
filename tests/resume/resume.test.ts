import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerAndLogin } from "../helpers.js";

describe("resume and AI modules", () => {
  it("uploads, analyzes, lists, details, and deletes a resume", async () => {
    const { accessToken } = await registerAndLogin("resume@example.com");
    const filePath = path.join(os.tmpdir(), "resume-test.pdf");
    fs.writeFileSync(filePath, "Experience with TypeScript Node.js Express MongoDB Docker. Education Projects Certifications.");

    const upload = await request(app)
      .post("/api/v1/resumes")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("resume", filePath, { filename: "resume.pdf", contentType: "application/pdf" });
    expect(upload.status).toBe(201);
    expect(upload.body.data.analysis.atsScore).toBeGreaterThan(0);
    const id = upload.body.data.resume._id;

    const list = await request(app).get("/api/v1/resumes").set("Authorization", `Bearer ${accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const details = await request(app).get(`/api/v1/resumes/${id}`).set("Authorization", `Bearer ${accessToken}`);
    expect(details.status).toBe(200);
    expect(details.body.data.analysis.provider).toBe("local");

    const analyze = await request(app).post(`/api/v1/resumes/${id}/analyze`).set("Authorization", `Bearer ${accessToken}`);
    expect(analyze.status).toBe(200);

    const deleted = await request(app).delete(`/api/v1/resumes/${id}`).set("Authorization", `Bearer ${accessToken}`);
    expect(deleted.status).toBe(200);
  });
});
