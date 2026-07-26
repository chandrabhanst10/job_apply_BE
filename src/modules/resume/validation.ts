import { z } from "zod";

export const resumeIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid resume id") })
});
