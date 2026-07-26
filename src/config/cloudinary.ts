import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
import { logger } from "./logger.js";

const isConfigured = !!(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  logger.info("Cloudinary client configured successfully");
} else {
  logger.warn("Cloudinary is not configured. Falling back to local file storage.");
}

export function isCloudinaryConfigured(): boolean {
  return isConfigured;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function uploadToCloudinary(filePath: string, folder = "resumes"): Promise<CloudinaryUploadResult> {
  if (!isConfigured) {
    throw new Error("Cloudinary credentials are not configured in environment variables.");
  }
  
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "raw", // Needed to support PDF & DOCX raw file uploads
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to upload file to Cloudinary");
    throw error;
  }
}

export { cloudinary };
