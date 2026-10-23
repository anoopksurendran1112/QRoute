// Credential schemas shared by the API validators and the admin forms, so both
// tiers reject the same input for the same reason.
//
// `registerSchema` deliberately has no `role` field. Zod's default object
// behaviour strips unknown keys, so a client that posts `role: "admin"` gets it
// silently discarded; the handler assigns the role server-side (T-01-12).

import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
