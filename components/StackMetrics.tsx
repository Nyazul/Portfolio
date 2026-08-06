import { SectionSplit } from "@/components/motion/SectionSplit";
import { sectionShapes } from "@/lib/particle-shapes";
import { getGithubMetrics } from "@/lib/github-metrics";

const stack = [
  { name: "Java / Spring Boot", level: 90 },
  { name: "PostgreSQL", level: 80 },
  { name: "Apache Kafka", level: 75 },
  { name: "React / TypeScript", level: 70 },
  { name: "Docker", level: 70 },
];

function formatAsOf(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Chunks the flat, chronologically-ordered contribution list back into
// 7-day columns (weeks) for the heatmap grid - see lib/github-metrics.ts,
// which flattens week-by-week in order, so simple 7-wide chunking recovers
// the original week structure without carrying week indices through JSON.
function toWeeks<T,>(days: T[]): T[][] {
  const weeks: T[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function intensity(count: number, max: number) {
  if (count === 0 || max === 0) return 0.08;
  const ratio = count / max;
  if (ratio > 0.75) return 1;
  if (ratio > 0.5) return 0.75;
  if (ratio > 0.25) return 0.5;
  return 0.3;
}

async function GithubLiveStats() {
  const result = await getGithubMetrics();

  if (!result.available) {
    return (
      <p className="text-sm text-text-tertiary">
        Live GitHub data is temporarily unavailable — check back soon.
      </p>
    );
  }

  const { data, source } = result;
  const maxDay = Math.max(0, ...data.contributionCalendar.map((d) => d.count));
  const weeks = toWeeks(data.contributionCalendar);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <div>
          <div className="font-mono text-2xl text-text-primary">
            {data.publicRepoCount}
          </div>
          <div className="text-xs text-text-tertiary">Public repos</div>
        </div>
        <div>
          <div className="font-mono text-2xl text-text-primary">
            {data.totalContributions}
          </div>
          <div className="text-xs text-text-tertiary">
            Contributions, past year
          </div>
        </div>
      </div>

      {data.topLanguages.length > 0 && (
        <div className="max-w-2xl space-y-3">
          <div className="text-xs text-text-tertiary">
            Top languages by byte share
          </div>
          {data.topLanguages.map((lang) => (
            <div key={lang.name}>
              <div className="mb-1.5 flex justify-between text-sm text-text-secondary">
                <span>{lang.name}</span>
                <span className="font-mono text-text-tertiary">
                  {Math.round(lang.byteShare * 100)}%
                </span>
              </div>
              <div className="h-px w-full bg-border">
                <div
                  className="h-px bg-signal"
                  style={{ width: `${lang.byteShare * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {weeks.length > 0 && (
        <div>
          <div className="mb-2 text-xs text-text-tertiary">
            Contribution calendar
          </div>
          <div
            className="flex gap-[3px] overflow-x-auto pb-1"
            role="img"
            aria-label={`${data.totalContributions} contributions in the past year`}
          >
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="h-[10px] w-[10px] bg-signal"
                    style={{ opacity: intensity(day.count, maxDay) }}
                    title={`${day.date}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {source === "fallback" && (
        <p className="text-xs text-text-tertiary">
          Showing a cached snapshot as of {formatAsOf(data.fetchedAt)} — live
          data will resume automatically.
        </p>
      )}
    </div>
  );
}

// Phase 1: self-assessed static bars, labeled as such.
// Phase 4: live GitHub data (repo count, language share, contribution
// calendar) added below via a server-side, hourly-cached fetch with a
// cached-snapshot fallback - see lib/github-metrics.ts and PRD Section 9.4.
// That data is never mocked; an honest "unavailable" beats a fake number.
export function StackMetrics() {
  return (
    <SectionSplit id="stack" theme="dark" shapePoints={sectionShapes.stack} reverse>
      <div className="mb-12 flex items-baseline justify-between">
        <h2 className="font-mono text-sm text-text-tertiary">04 / Stack</h2>
        <p className="text-sm text-text-tertiary">Live GitHub stats</p>
      </div>

      <div className="mb-12 max-w-2xl space-y-5">
        {stack.map((item) => (
          <div key={item.name}>
            <div className="mb-2 flex justify-between text-sm text-text-secondary">
              <span>{item.name}</span>
              <span className="font-mono text-text-tertiary">
                {item.level}%
              </span>
            </div>
            <div className="h-px w-full bg-border">
              <div
                className="h-px bg-signal"
                style={{ width: `${item.level}%` }}
              />
            </div>
          </div>
        ))}
        <p className="mt-6 text-xs text-text-tertiary">
          Self-assessed, not derived from any external metric.
        </p>
      </div>

      <GithubLiveStats />
    </SectionSplit>
  );
}
