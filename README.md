# AI Job Application SaaS Backend

Backend-only Node.js + TypeScript API for authentication, user profiles, resume uploads, AI resume analysis, dashboard summaries, logging, security middleware, OpenAPI docs, tests, and Docker.

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

API base URL: `http://localhost:4000/api/v1`

Swagger UI: `http://localhost:4000/docs`

## Main Modules

- `auth`: register, login, logout, token refresh, email verification, forgot/reset/change password, current user.
- `users`: profile read/update/delete and profile image upload.
- `resumes`: PDF/DOCX upload, list, detail, download, delete, and analysis.
- `ai`: Google Gemini integration with local deterministic analysis fallback when `GEMINI_API_KEY` is absent.
- `dashboard`: summary, resume statistics, ATS score, recent activity.

## Security

The API includes Helmet, CORS, rate limiting, compression, cookie parsing, CSRF protection for cookie-authenticated browser requests, XSS sanitization, NoSQL sanitization, request body limits, JWT access tokens, refresh-token rotation, HttpOnly cookies, role-based authorization, and audit logs.

## Environment

See `.env.example` for all required variables. JWT secrets must be at least 32 characters.

## Docker

```bash
docker compose up --build
```

## Tests

```bash
npm test
```
