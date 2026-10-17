// Kernel task count over time for the zombie-process outage: a sawtooth that
// climbs at the real leak rate (240/h) to the real limit (threads-max
// 31,069), locks up, is reset by a reboot, and goes flat once tini reaps the
// children. Rate, limit and alert thresholds are real; the calendar spacing
// of the cycles is schematic. Static inline SVG, themed via CSS vars.

const LIMIT = 31069;
const BASE = 600; // rough resting task count, schematic
const RATE_PER_DAY = 240 * 24;
const DAYS_TO_LOCKUP = (LIMIT - BASE) / RATE_PER_DAY; // ~5.3

const W = 640;
const H = 260;
const PAD = { l: 56, r: 16, t: 18, b: 34 };
const TOTAL_DAYS = 20;

const x = (day: number) => PAD.l + (day / TOTAL_DAYS) * (W - PAD.l - PAD.r);
const y = (tasks: number) => PAD.t + (1 - tasks / (LIMIT * 1.08)) * (H - PAD.t - PAD.b);

// Two full leak cycles (each ends in a lockup + reboot), then the fix.
const cycles = [0, DAYS_TO_LOCKUP + 0.4];
const FIX_DAY = cycles[1] + DAYS_TO_LOCKUP * 0.55 + 0.4;

function buildPath() {
  let d = "";
  for (const start of cycles) {
    const end = start + DAYS_TO_LOCKUP;
    d += `${d ? " L" : "M"} ${x(start)} ${y(BASE)} L ${x(end)} ${y(LIMIT)}`;
    // flat at the limit while the host is locked, then the reboot drop
    d += ` L ${x(end + 0.4)} ${y(LIMIT)} L ${x(end + 0.4)} ${y(BASE)}`;
  }
  return d;
}

export function LeakTimeline() {
  const leakPath = buildPath();
  const fixStart = cycles[1] + DAYS_TO_LOCKUP + 0.4;
  const fixedPath = `M ${x(fixStart)} ${y(BASE)} L ${x(FIX_DAY)} ${y(BASE + (FIX_DAY - fixStart) * RATE_PER_DAY)} L ${x(FIX_DAY + 0.15)} ${y(BASE)} L ${x(TOTAL_DAYS)} ${y(BASE)}`;
  const thresholds = [
    { v: LIMIT, label: "threads-max 31,069", strong: true },
    { v: LIMIT * 0.95, label: "95% CRITICAL" },
    { v: LIMIT * 0.8, label: "80% WARNING" },
  ];
  const lockups = cycles.map((c) => c + DAYS_TO_LOCKUP);

  return (
    <figure className="my-8 rounded-lg border border-border bg-bg-elevated p-4">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs text-text-tertiary">
        <span>Kernel tasks over time</span>
        <span>Rate and limit real · cycle timing schematic</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Task count climbs about 5,760 per day until it hits threads-max after about 5.4 days and the host locks up; a reboot resets it and the cycle repeats until the fix, after which it stays flat."
      >
        {thresholds.map((t) => (
          <g key={t.label}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t.v)}
              y2={y(t.v)}
              stroke={t.strong ? "var(--color-text-secondary)" : "var(--color-border)"}
              strokeDasharray={t.strong ? undefined : "4 4"}
            />
            <text
              x={W - PAD.r}
              y={y(t.v) - 4}
              fontSize={10}
              textAnchor="end"
              fill="var(--color-text-tertiary)"
              fontFamily="var(--font-mono)"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* axes */}
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-border)" />
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--color-border)" />
        {[0, 5, 10, 15, 20].map((d) => (
          <text
            key={d}
            x={x(d)}
            y={H - PAD.b + 16}
            fontSize={10}
            textAnchor="middle"
            fill="var(--color-text-tertiary)"
            fontFamily="var(--font-mono)"
          >
            {d}d
          </text>
        ))}
        {[0, 10000, 20000, 30000].map((v) => (
          <text
            key={v}
            x={PAD.l - 8}
            y={y(v) + 3}
            fontSize={10}
            textAnchor="end"
            fill="var(--color-text-tertiary)"
            fontFamily="var(--font-mono)"
          >
            {v / 1000}k
          </text>
        ))}

        <path d={leakPath} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
        <path d={fixedPath} fill="none" stroke="var(--color-text-primary)" strokeWidth={2} />

        {lockups.map((d) => (
          <g key={d}>
            <circle cx={x(d)} cy={y(LIMIT)} r={5} fill="var(--color-accent)" />
            <text
              x={x(d + 0.2)}
              y={y(LIMIT) + 18}
              fontSize={10}
              textAnchor="middle"
              fill="var(--color-accent)"
              fontFamily="var(--font-mono)"
            >
              lockup → reboot
            </text>
          </g>
        ))}
        <g>
          <line
            x1={x(FIX_DAY)}
            x2={x(FIX_DAY)}
            y1={PAD.t + 30}
            y2={H - PAD.b}
            stroke="var(--color-text-secondary)"
            strokeDasharray="2 3"
          />
          <text
            x={x(FIX_DAY) + 6}
            y={PAD.t + 44}
            fontSize={10}
            fill="var(--color-text-primary)"
            fontFamily="var(--font-mono)"
          >
            init: true deployed - flat from here
          </text>
        </g>
      </svg>
      <p className="mt-2 text-sm text-text-secondary">
        240 leaked tasks an hour against a 31,069 limit: about 129 hours, or
        5.4 days, from boot to a host where nothing can fork.
      </p>
    </figure>
  );
}
