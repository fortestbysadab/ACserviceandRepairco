import { z } from "zod";

/**
 * Server-side environment contract.
 *
 * Everything here is a server secret: never import this module from a client
 * component. Validation is lazy so `next build` can run without a database,
 * while the first real connection fails loudly and early.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Pooled connection string (Neon: host contains `-pooler`). */
  DATABASE_URL: z.string().url().startsWith("postgres"),
  /** Unpooled connection string used only by the migration runner. */
  DIRECT_DATABASE_URL: z.string().url().startsWith("postgres").optional(),

  /** Signs portal session cookies. 32+ random bytes. */
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  /** Bearer token accepted by /api/cron/*. */
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),

  /** Public origin of the marketing static site, used for redirects + CORS. */
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  /** Cookie domain shared by www + app subdomains, e.g. `.sheet-al.in`. */
  COOKIE_DOMAIN: z.string().optional(),

  // ---- provisioned later, kept optional so the scaffold boots without them ----
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** True when every WhatsApp field is present — used to skip webhook wiring. */
export function whatsappConfigured(): boolean {
  const e = env();
  return Boolean(e.META_APP_SECRET && e.META_VERIFY_TOKEN && e.META_ACCESS_TOKEN && e.META_PHONE_NUMBER_ID);
}
