#!/usr/bin/env node
/**
 * Minimal, dependency-light migration runner.
 *
 *   node scripts/migrate.mjs            apply pending migrations
 *   node scripts/migrate.mjs --status   list applied / pending and exit
 *
 * Rules:
 *  - runs on the DIRECT (unpooled) connection string when available, because
 *    DDL inside a transaction must not share a multiplexed pooler session;
 *  - each file is applied inside its own transaction with its advisory lock,
 *    so two deploy instances booting at once cannot double-apply;
 *  - applied files are recorded with a sha-256 checksum, and a changed file is
 *    a hard error — add a new numbered migration instead of editing history.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../src/db/migrations");
const statusOnly = process.argv.includes("--status");

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✗ Neither DIRECT_DATABASE_URL nor DATABASE_URL is set.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
});

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

async function main() {
  await client.connect();
  await client.query(`
    create table if not exists schema_migrations (
      name       text primary key,
      checksum   text not null,
      applied_at timestamptz not null default now()
    )
  `);

  const applied = new Map(
    (await client.query("select name, checksum from schema_migrations order by name")).rows.map((r) => [
      r.name,
      r.checksum,
    ]),
  );

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

  if (statusOnly) {
    for (const file of files) {
      const state = applied.has(file) ? "applied" : "pending";
      console.log(`${state.padEnd(8)} ${file}`);
    }
    console.log(`\n${applied.size} applied, ${files.length - applied.size} pending`);
    return;
  }

  let ran = 0;
  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const checksum = sha256(sql);
    const previous = applied.get(file);

    if (previous) {
      if (previous !== checksum) {
        throw new Error(`${file} changed after being applied (checksum mismatch). Add a new migration.`);
      }
      continue;
    }

    // advisory lock keyed on the migration name: safe for concurrent deploys
    const lockKey = Number.parseInt(sha256(file).slice(0, 15), 16);
    await client.query("select pg_advisory_lock($1)", [lockKey]);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name, checksum) values ($1, $2)", [file, checksum]);
      await client.query("commit");
      console.log(`✓ applied ${file}`);
      ran += 1;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw new Error(`failed to apply ${file}: ${error.message}`);
    } finally {
      await client.query("select pg_advisory_unlock($1)", [lockKey]).catch(() => {});
    }
  }

  console.log(ran === 0 ? "✓ database already up to date" : `✓ ${ran} migration(s) applied`);
}

main()
  .catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => client.end().catch(() => {}));
