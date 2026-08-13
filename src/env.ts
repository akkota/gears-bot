import { config } from "dotenv";
import { z } from "zod";

config();

const optionalNonEmpty = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

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
  PLANIO_BASE_URL: z
    .string()
    .trim()
    .default("https://eswprojects.plan.io")
    .transform((value) => value.replace(/\/+$/, "")),
  IMAP_HOST: optionalNonEmpty,
  IMAP_PORT: z.preprocess((value) => {
    if (value === undefined || value === "") {
      return 993;
    }
    return value;
  }, z.coerce.number().int().positive()),
  IMAP_SECURE: z.preprocess((value) => {
    if (value === undefined || value === "") {
      return true;
    }
    if (typeof value === "string") {
      return !["0", "false", "no"].includes(value.toLowerCase());
    }
    return Boolean(value);
  }, z.boolean()),
  IMAP_USER: optionalNonEmpty,
  IMAP_PASSWORD: optionalNonEmpty,
  IMAP_MAILBOX: z.string().trim().default("INBOX"),
  GOOGLE_SERVICE_ACCOUNT_JSON: optionalNonEmpty,
  INSTAGRAM_ACCESS_TOKEN: optionalNonEmpty,
  INSTAGRAM_USER_ID: optionalNonEmpty,
  LINKEDIN_ACCESS_TOKEN: optionalNonEmpty,
  LINKEDIN_ORG_URN: optionalNonEmpty,
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
