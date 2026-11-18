import { Pool, type PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env";
import * as schema from "@/db/schema";

/**
 * Lazy pool: created on first use, never at import time.
 *
 * This keeps `next build` free of database credentials — route modules are
 * imported during build to collect metadata, and connecting there would fail
 * on a build machine that has no secrets.
 *
 * Neon's pooler endpoint multiplexes connections, so a small `max` is plenty
 * for a single Render instance and keeps us inside the free-tier limits.
 */
let poolInstance: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

export function getPool(): Pool {
  if (!poolInstance) {
    const { DATABASE_URL } = env();
    poolInstance = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      ssl: DATABASE_URL.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
    });
  }
  return poolInstance;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!dbInstance) dbInstance = drizzle(getPool(), { schema });
  return dbInstance;
}

/** Round-trip latency in ms — used by the health check. */
export async function pingDb(): Promise<number> {
  const started = Date.now();
  await getPool().query("select 1");
  return Date.now() - started;
}

/** Run `fn` inside a transaction, rolling back on any throw. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** Close the pool — for scripts and graceful shutdown, not request handlers. */
export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
  }
}
