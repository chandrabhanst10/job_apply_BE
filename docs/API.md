# API Documentation

All JSON responses follow:

```json
{ "success": true, "message": "", "data": {}, "errors": [] }
```

Protected endpoints accept `Authorization: Bearer <accessToken>` or the issued HttpOnly cookie.

## Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/change-password`
- `GET /api/v1/auth/me`

## Users

- `GET /api/v1/users/profile`
- `PATCH /api/v1/users/profile`
- `DELETE /api/v1/users/profile`
- `POST /api/v1/users/profile/image`

## Resumes

- `POST /api/v1/resumes`
- `GET /api/v1/resumes`
- `GET /api/v1/resumes/:id`
- `GET /api/v1/resumes/:id/download`
- `DELETE /api/v1/resumes/:id`
- `POST /api/v1/resumes/:id/analyze`

## Dashboard

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/resume-statistics`
- `GET /api/v1/dashboard/ats-score`
- `GET /api/v1/dashboard/recent-activity`
