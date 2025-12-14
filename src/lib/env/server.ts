import "server-only";

import { z } from "zod";

/**
 * Server-only environment variables.
 *
 * Keep this separate from `envPublic` to prevent accidental client bundling.
 * Never expose secrets via logs.
 */
const serverEnvSchema = z.object({
  // Optional today; becomes required if/when we introduce admin maintenance tasks.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

if (!parsed.success) {
  // Never log secrets. Only log which keys are invalid/missing.
  console.error("Invalid server environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid server environment variables.");
}

export const envServer = parsed.data;


