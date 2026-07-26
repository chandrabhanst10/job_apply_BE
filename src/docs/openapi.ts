export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "AI Job Application SaaS API",
    version: "1.0.0",
    description: "Backend APIs for authentication, user profiles, resume management, AI resume analysis, and dashboard data."
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    }
  },
  paths: {
    "/auth/register": { post: { tags: ["Auth"], summary: "Register a user" } },
    "/auth/login": { post: { tags: ["Auth"], summary: "Login" } },
    "/auth/refresh-token": { post: { tags: ["Auth"], summary: "Rotate refresh token" } },
    "/auth/logout": { post: { tags: ["Auth"], summary: "Logout", security: [{ bearerAuth: [] }] } },
    "/auth/me": { get: { tags: ["Auth"], summary: "Get current user", security: [{ bearerAuth: [] }] } },
    "/users/profile": {
      get: { tags: ["Users"], summary: "Get profile", security: [{ bearerAuth: [] }] },
      patch: { tags: ["Users"], summary: "Update profile", security: [{ bearerAuth: [] }] },
      delete: { tags: ["Users"], summary: "Delete account", security: [{ bearerAuth: [] }] }
    },
    "/resumes": {
      get: { tags: ["Resumes"], summary: "List resumes", security: [{ bearerAuth: [] }] },
      post: { tags: ["Resumes"], summary: "Upload resume", security: [{ bearerAuth: [] }] }
    },
    "/resumes/{id}": {
      get: { tags: ["Resumes"], summary: "Get resume details", security: [{ bearerAuth: [] }] },
      delete: { tags: ["Resumes"], summary: "Delete resume", security: [{ bearerAuth: [] }] }
    },
    "/resumes/{id}/download": { get: { tags: ["Resumes"], summary: "Download resume", security: [{ bearerAuth: [] }] } },
    "/resumes/{id}/analyze": { post: { tags: ["AI"], summary: "Run resume analysis", security: [{ bearerAuth: [] }] } },
    "/dashboard/summary": { get: { tags: ["Dashboard"], summary: "Dashboard summary", security: [{ bearerAuth: [] }] } }
  }
};
