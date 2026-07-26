import { z } from "zod";

export const updateSettingsSchema = z.object({
  body: z.object({
    feedScanEnabled: z.boolean().optional(),
    minMatchScore: z.number().min(0).max(100).optional()
  })
});
