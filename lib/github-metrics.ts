import fallbackSnapshot from "./github-metrics-fallback.json";

const GITHUB_USERNAME = "Nyazul";
const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export type LanguageShare = {
  name: string;
  byteShare: number; // 0..1
};

export type ContributionDay = {
  date: string; // YYYY-MM-DD
  count: number;
};

export type GithubMetricsSnapshot = {
  fetchedAt: string; // ISO timestamp
  publicRepoCount: number;
  topLanguages: LanguageShare[];
  contributionCalendar: ContributionDay[];
  totalContributions: number;
};

export type GithubMetricsResult =
  | { available: true; source: "live" | "fallback"; data: GithubMetricsSnapshot }
  | { available: false };

// GraphQL is required for the contribution calendar (not exposed via REST),
// and since we need auth for that anyway we use it for repos/languages too -
// one round trip instead of N REST calls per repo. Capped at the 100 most
// recently pushed public, non-fork repos owned by the account; fine for a
// portfolio-sized account, would need pagination past that.
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
              node {
                name
              }
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

type GraphQLRepoNode = {
  languages: {
    edges: { size: number; node: { name: string } }[];
  };
};

type GraphQLResponse = {
  data?: {
    user: {
      repositories: {
        totalCount: number;
        nodes: GraphQLRepoNode[];
      };
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: {
            contributionDays: { date: string; contributionCount: number }[];
          }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
};

function aggregateLanguages(nodes: GraphQLRepoNode[]): LanguageShare[] {
  const bytesByLanguage = new Map<string, number>();

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

/**
 * Fetches live metrics from the GitHub GraphQL API. Throws on any failure
 * (missing/expired token, rate limit, network error, malformed response) -
 * callers are expected to fall back to the cached snapshot, per PRD 9.4.
 */
export async function fetchLiveGithubMetrics(): Promise<GithubMetricsSnapshot> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is not set");
  }

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: GITHUB_USERNAME } }),
    // Next.js Data Cache: revalidate hourly so the public page is never
    // waiting on a live GitHub round trip, and stays within rate limits.
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    // Covers 401 (expired fine-grained PAT), 403 (rate-limited), 5xx, etc.
    // - all routed to the same fallback path, per PRD 9.4 token guidance.
    throw new Error(`GitHub API responded ${res.status}`);
  }

  const json = (await res.json()) as GraphQLResponse;

  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${json.errors[0].message}`);
  }
  if (!json.data?.user) {
    throw new Error("GitHub GraphQL response missing user data");
  }

  const { repositories, contributionsCollection } = json.data.user;
  const calendar = contributionsCollection.contributionCalendar;

  return {
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
}

function readFallbackSnapshot(): GithubMetricsSnapshot | null {
  // The bundled snapshot starts out honestly empty (fetchedAt: "") until
  // `npm run github:snapshot` is run once with a real token configured -
  // see scripts/generate-github-snapshot.mjs. We never fabricate numbers.
  if (!fallbackSnapshot.fetchedAt) return null;
  return fallbackSnapshot as GithubMetricsSnapshot;
}

/**
 * Orchestrates the fetch/cache/fallback strategy from PRD 9.4: try a live,
 * cached (hourly) fetch first; on any failure, fall back to the last
 * committed snapshot; if neither is available, report unavailable honestly
 * rather than rendering zeros or fake data.
 */
export async function getGithubMetrics(): Promise<GithubMetricsResult> {
  try {
    const data = await fetchLiveGithubMetrics();
    return { available: true, source: "live", data };
  } catch {
    const fallback = readFallbackSnapshot();
    if (fallback) {
      return { available: true, source: "fallback", data: fallback };
    }
    return { available: false };
  }
}
