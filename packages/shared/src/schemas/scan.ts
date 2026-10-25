import { z } from "zod";

export const scanResolveSchema = z.object({
  token: z.string().min(10),
});

export type ScanResolveInput = z.infer<typeof scanResolveSchema>;
