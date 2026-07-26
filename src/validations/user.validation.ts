import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).trim().optional(),
    mobile: z.string().max(30).trim().optional(),
    linkedIn: z.string().url().max(300).optional(),
    github: z.string().url().max(300).optional(),
    portfolio: z.string().url().max(300).optional(),
    country: z.string().max(80).trim().optional(),
    city: z.string().max(80).trim().optional(),
    aiPrompt: z.string().max(2000).trim().optional(),
    targetSkills: z.array(z.string().trim()).optional()
  }).strict().refine((value) => Object.keys(value).length > 0, "At least one profile field is required")
});
