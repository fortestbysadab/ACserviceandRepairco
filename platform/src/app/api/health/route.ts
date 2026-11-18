import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Render health check + uptime probe.
 *
 * 200 — app responding and the database round-tripped inside the budget
 * 503 — database unreachable or too slow (Render will not route traffic here)
 *
 * Deliberately says nothing about schema contents or versions: this endpoint
 * is public.
 */
export async function GET() {
  const startedAt = Date.now();

  let db: { ok: boolean; latencyMs: number | null; error?: string } = { ok: false, latencyMs: null };
  try {
    const latencyMs = await Promise.race([
      pingDb(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("db timeout")), 4_000)),
    ]);
    db = { ok: true, latencyMs };
  } catch (error) {
    db = { ok: false, latencyMs: null, error: error instanceof Error ? error.message : "unknown" };
  }

  const body = {
    status: db.ok ? "ok" : "degraded",
    service: "sheetal-platform",
    uptimeSeconds: Math.round(process.uptime()),
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    region: process.env.RENDER_REGION ?? null,
    checks: { database: db },
    tookMs: Date.now() - startedAt,
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: db.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
