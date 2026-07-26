import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import type { Request, Response, NextFunction } from "express";
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
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}-${sanitizedName.slice(0, 30)}${ext}`);
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

export function validateResumeFileHeader(req: Request, _res: Response, next: NextFunction): void {
  if (!req.file) {
    next();
    return;
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    let isValid = false;
    if (ext === ".pdf") {
      // PDF header signature: %PDF (0x25, 0x50, 0x44, 0x46)
      isValid = buffer.toString("utf8", 0, 4) === "%PDF";
    } else if (ext === ".docx") {
      // DOCX (ZIP archive header): PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
      isValid = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    }

    if (!isValid) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      next(new BadRequestError("Invalid file content signature. File magic bytes do not match a genuine PDF or DOCX document."));
      return;
    }

    next();
  } catch (err) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    next(new BadRequestError("Failed to inspect uploaded file header signature."));
  }
}

