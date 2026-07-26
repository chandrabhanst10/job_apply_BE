# Environment Variables

Copy `.env.example` to `.env` and set production-grade secrets before deployment.

- `MONGO_URI`: MongoDB connection string.
- `REDIS_URL`: Redis connection string reserved for cache/session expansion.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EMAIL_SECRET`, `JWT_PASSWORD_RESET_SECRET`: distinct secrets with at least 32 characters.
- `GEMINI_API_KEY`: enables Google Gemini analysis.
- `UPLOAD_DIR`: disk path for uploaded files.
- `MAX_UPLOAD_MB`: resume upload cap.
- `COOKIE_SECURE`: set to `true` behind HTTPS.
