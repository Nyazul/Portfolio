#!/usr/bin/env node
// One-time (or occasional) generator for lib/github-metrics-fallback.json -
// the committed safety net rendered when the live GitHub fetch fails (PRD
// Section 9.4). Not run automatically; run it by hand whenever you want to
// refresh the fallback with real numbers.
//
// Usage:
//   GITHUB_TOKEN=ghp_xxx npm run github:snapshot
// or, if GITHUB_TOKEN is already in .env.local and your Node supports it:
//   node --env-file=.env.local scripts/generate-github-snapshot.mjs
//
// Uses the same fine-grained PAT as the app itself (read-only, public
// repository metadata) - never commit the token, only the JSON it produces.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const GITHUB_USERNAME = "Nyazul";
const OUTPUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "lib",
  "github-metrics-fallback.json",
);

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      repositories(
        first: 100
        isFork: false
        privacy: PUBLIC
        ownerAffiliations: OWNER
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        nodes {
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node { name }
            }
          }
        }
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

function aggregateLanguages(nodes) {
  const bytesByLanguage = new Map();
  for (const repo of nodes) {
    for (const edge of repo.languages.edges) {
      bytesByLanguage.set(
        edge.node.name,
        (bytesByLanguage.get(edge.node.name) ?? 0) + edge.size,
      );
    }
  }
  const totalBytes = [...bytesByLanguage.values()].reduce((a, b) => a + b, 0);
  if (totalBytes === 0) return [];
  return [...bytesByLanguage.entries()]
    .map(([name, bytes]) => ({ name, byteShare: bytes / totalBytes }))
    .sort((a, b) => b.byteShare - a.byteShare)
    .slice(0, 6);
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(
      "GITHUB_TOKEN is not set. Run: GITHUB_TOKEN=ghp_xxx npm run github:snapshot",
    );
    process.exit(1);
  }

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: GITHUB_USERNAME } }),
  });

  if (!res.ok) {
    console.error(`GitHub API responded ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const json = await res.json();
  if (json.errors?.length) {
    console.error(`GitHub GraphQL error: ${json.errors[0].message}`);
    process.exit(1);
  }

  const { repositories, contributionsCollection } = json.data.user;
  const calendar = contributionsCollection.contributionCalendar;

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    publicRepoCount: repositories.totalCount,
    topLanguages: aggregateLanguages(repositories.nodes),
    contributionCalendar: calendar.weeks.flatMap((week) =>
      week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
      })),
    ),
    totalContributions: calendar.totalContributions,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(
    `${snapshot.publicRepoCount} public repos, ${snapshot.totalContributions} contributions in the past year.`,
  );
}

main();
