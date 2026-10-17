import { NextResponse } from "next/server";

// Liveness + build identity, polled by the status panel and the hero's
// request-log line (lib/health.ts). Deliberately does no I/O: it answers
// "is the app up and which build is it", and its round-trip time from the
// visitor's browser is the latency the panel reports.
export const dynamic = "force-dynamic";

// Module scope runs once per server instance, so this is when the instance
// that's answering started - a fresh value after a cold start.
const instanceStartedAt = new Date().toISOString();

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      commit: process.env.NEXT_PUBLIC_COMMIT_SHA || null,
      builtAt: process.env.NEXT_PUBLIC_BUILT_AT || null,
      region: process.env.VERCEL_REGION || null,
      instanceStartedAt,
      serverTime: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
