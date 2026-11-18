import type { Config } from "drizzle-kit";

/**
 * Used for `npm run db:generate` (diffing the TypeScript schema for review).
 * Migrations that actually run are the numbered .sql files applied by
 * scripts/migrate.mjs — deliberately explicit, reviewable SQL.
 */
export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
