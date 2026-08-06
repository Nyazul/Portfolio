import { NextResponse } from "next/server";
import { getGithubMetrics } from "@/lib/github-metrics";

// Hourly cache on this route's own response, on top of the revalidate: 3600
// already set on the underlying GraphQL fetch in lib/github-metrics.ts.
export const revalidate = 3600;

export async function GET() {
  const result = await getGithubMetrics();
  return NextResponse.json(result);
}
