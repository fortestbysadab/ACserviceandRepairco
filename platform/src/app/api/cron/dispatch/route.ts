import { NextResponse, type NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Bounded queue drain — the "sweep" from the architecture doc.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (constant-time compare below).
 * Called every minute by:
 *   - Render Cron Job (needs a paid instance type), or
 *   - .github/workflows/dispatch-sweep.yml (free-tier stand-in, every 5 min)
 *
 * Phase 1 behaviour: reclaim expired leases, count due work, and return
 * metrics. Phase 2 registers one handler per `outbox.kind`. Keep the batch
 * small: a function must always finish inside `maxDuration`.
 */

const BATCH = 25;

function authorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env().CRON_SECRET}`;
  if (header.length !== expected.length) return false;
  // constant-time compare so the secret cannot be probed byte by byte
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  let client;
  try {
    client = await getPool().connect();
  } catch (error) {
    // Database unreachable is an outage, not a bug: 503 so the scheduler
    // retries instead of alerting on a code fault.
    return NextResponse.json(
      { ok: false, error: "database unavailable", detail: error instanceof Error ? error.message : "unknown" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    // 1. Reclaim leases whose holder died mid-flight.
    const reclaimed = await client.query(
      `update outbox
          set status = 'pending', lease_expires_at = null, updated_at = now()
        where status = 'leased' and lease_expires_at < now()
        returning id`,
    );

    // 2. Claim a small batch in stable order; SKIP LOCKED keeps concurrent
    //    sweeps from fighting over the same rows.
    const due = await client.query(
      `with claimed as (
         select id from outbox
          where status = 'pending' and next_attempt_at <= now()
          order by next_attempt_at
          for update skip locked
          limit $1
       )
       select id, kind, action_key from outbox where id in (select id from claimed)`,
      [BATCH],
    );

    // 3. Phase 2 hook: dispatch by `kind`. Nothing to send yet, so the batch is
    //    released immediately rather than leaving stale leases behind.
    const backlog = await client.query(`select count(*)::int as count from outbox where status = 'pending'`);

    return NextResponse.json(
      {
        ok: true,
        reclaimed: reclaimed.rowCount ?? 0,
        claimed: due.rowCount ?? 0,
        pending: backlog.rows[0]?.count ?? 0,
        handlersRegistered: 0,
        tookMs: Date.now() - startedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/** Convenience for manual pokes from a terminal or uptime monitor. */
export async function GET(request: NextRequest) {
  return POST(request);
}
