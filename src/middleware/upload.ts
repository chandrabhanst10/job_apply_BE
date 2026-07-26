import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { BadRequestError } from "../utils/app-error.js";

const allowed = new Map([
  [".pdf", "application/pdf"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
]);

const storage = multer.diskStorage({
  destination: env.UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  }
});

export const uploadResume = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.get(ext) !== file.mimetype) {
      cb(new BadRequestError("Only PDF and DOCX resumes are supported"));
      return;
    }
    cb(null, true);
  }
});
