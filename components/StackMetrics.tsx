import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import {
  type HeatmapColumn,
  HeatmapCells,
  HeatmapChart,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
} from "@/components/charts/heatmap";
import { RingChart } from "@/components/charts/ring-chart";
import { ChartTooltip } from "@/components/charts/tooltip";
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
// 7-day HeatmapColumn[] for @bklit/heatmap-chart - see lib/github-metrics.ts,
// which flattens week-by-week in order, so simple 7-wide chunking recovers
// the original week structure without carrying week indices through JSON.
function toHeatmapColumns(
  days: { date: string; count: number }[]
): HeatmapColumn[] {
  const columns: HeatmapColumn[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    columns.push({
      bin: columns.length,
      bins: week.map((day, row) => ({
        count: day.count,
        bin: row,
        date: new Date(day.date),
      })),
    });
  }
  return columns;
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
  const heatmapColumns = toHeatmapColumns(data.contributionCalendar);

  // "Days active in the past year" is the only honest ratio we can chart from
  // the calendar without inventing a max/target: days with at least one
  // contribution, out of the total days GitHub reports for the past year
  // (356–371 depending on week alignment). Derived purely from real counts.
  const calendarDays = data.contributionCalendar.length;
  const activeDays = data.contributionCalendar.filter((d) => d.count > 0).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
        {/* Public repos: a plain stat number. There's no honest denominator to
            chart this against, so a ring/gauge would just be dressing a fake
            ratio — a number is the truthful, readable form here. */}
        <div className="flex items-baseline gap-2">
          <div className="font-mono text-2xl text-text-primary">
            {data.publicRepoCount}
          </div>
          <div className="text-xs text-text-tertiary">Public repos</div>
        </div>

        {/* Contributions: a ring of days active in the past year — a real
            ratio (days with ≥1 contribution / total calendar days), not a
            fabricated max. Same data as the calendar below. */}
        {calendarDays > 0 && (
          <RingChart
            value={activeDays}
            total={calendarDays}
            label="days active"
            caption={`of ${calendarDays} days, past year`}
            ariaLabel={`${activeDays} days active out of ${calendarDays} days in the past year`}
          />
        )}
      </div>

      {heatmapColumns.length > 0 && (
        <div>
          <div className="mb-2 text-xs text-text-tertiary">
            Contribution calendar
          </div>
          <div
            aria-label={`${data.totalContributions} contributions in the past year`}
            role="img"
          >
            <HeatmapChart aspectRatio="5 / 1" data={heatmapColumns}>
              <HeatmapCells />
              <HeatmapXAxis />
              <HeatmapTooltip />
            </HeatmapChart>
            <div className="mt-2 flex justify-end">
              <HeatmapLegend />
            </div>
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
// Phase 4: live GitHub data (public repo count, days-active contribution
// ring, contribution calendar) below via a server-side, hourly-cached fetch
// with a cached-snapshot fallback - see lib/github-metrics.ts and PRD 9.4.
// That data is never mocked; an honest "unavailable" beats a fake number.
export function StackMetrics() {
  return (
    <SectionSplit id="stack" theme="dark" shapePoints={sectionShapes.stack} reverse>
      <div className="mb-12 flex items-baseline justify-between">
        <h2 className="font-mono text-sm text-text-tertiary">04 / Stack</h2>
        <p className="text-sm text-text-tertiary">Live GitHub stats</p>
      </div>

      <div className="mb-12 max-w-2xl">
        <BarChart
          aspectRatio="3 / 2"
          data={stack.map((item) => ({ name: item.name, level: item.level }))}
          margin={{ top: 8, right: 16, bottom: 8, left: 140 }}
          orientation="horizontal"
          xDataKey="name"
        >
          <Bar
            dataKey="level"
            fill="var(--chart-line-primary)"
            lineCap="round"
            minBarHeight={4}
          />
          <BarYAxis />
          <ChartTooltip showDatePill={false} />
        </BarChart>
        <p className="mt-6 text-xs text-text-tertiary">
          Self-assessed, not derived from any external metric.
        </p>
      </div>

      <GithubLiveStats />
    </SectionSplit>
  );
}
