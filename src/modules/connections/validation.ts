import { z } from "zod";

export const linkConnectionSchema = z.object({
  body: z.object({
    username: z.string().min(1, "Username is required"),
    cookiesJson: z.string().min(1, "Cookies JSON is required")
  })
});
