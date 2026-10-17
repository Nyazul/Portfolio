import { execSync } from "node:child_process";

// Build identity for /api/health and the status panel: which commit is
// live and when it was built. Vercel provides the SHA; local builds ask git.
function commitSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

// Next evaluates this file more than once per build (main process and
// workers). Stamping the env first means every later evaluation - which
// inherits it - reports the same build time.
process.env.NEXT_PUBLIC_BUILT_AT ||= new Date().toISOString();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha(),
    NEXT_PUBLIC_BUILT_AT: process.env.NEXT_PUBLIC_BUILT_AT,
  },
};

export default nextConfig;
