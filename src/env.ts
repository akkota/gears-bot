import { config } from "dotenv";
import { z } from "zod";

config();

const EnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_GUILD_ID: z.string().min(1, "DISCORD_GUILD_ID is required"),
  SUPABASE_URL: z.url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const missingOrInvalid = parsedEnv.error.issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean);

  throw new Error(
    `Invalid environment variables: ${missingOrInvalid.join(", ")}`,
  );
}

export const env = parsedEnv.data;
export type Env = typeof env;
