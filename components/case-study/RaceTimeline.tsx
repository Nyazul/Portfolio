// Two-lane timeline of the billing race, before and after. Static inline SVG
// (no JS) so it renders identically everywhere and inherits the page palette
// through currentColor / CSS vars.

type Step = { lane: 0 | 1; t: number; label: string; tone?: "bad" | "ok" | "muted" };

const before: Step[] = [
  { lane: 0, t: 0, label: "read used=99" },
  { lane: 1, t: 1, label: "read used=99" },
  { lane: 0, t: 2, label: "99<100 ✓ write 100", tone: "muted" },
  { lane: 1, t: 3, label: "99<100 ✓ write 100", tone: "bad" },
];

const after: Step[] = [
  { lane: 0, t: 0.5, label: "UPDATE … → 1 row", tone: "ok" },
  { lane: 1, t: 2, label: "UPDATE … → 0 rows", tone: "bad" },
];

function Lane({ title, steps, verdict }: { title: string; steps: Step[]; verdict: string }) {
  const W = 360;
  const laneY = [52, 112];
  const x = (t: number) => 70 + t * 70;
  const color = (tone?: Step["tone"]) =>
    tone === "bad"
      ? "var(--color-accent)"
      : tone === "ok"
        ? "var(--color-text-primary)"
        : "var(--color-text-secondary)";

  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <p className="mb-2 font-mono text-xs text-text-tertiary">{title}</p>
      <svg viewBox={`0 0 ${W} 150`} className="w-full" role="img" aria-label={`${title}: ${verdict}`}>
        {laneY.map((y, i) => (
          <g key={y}>
            <text x={0} y={y + 4} fontSize={11} fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">
              Req {i === 0 ? "A" : "B"}
            </text>
            <line x1={52} x2={W - 8} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} />
          </g>
        ))}
        {steps.map((s, i) => {
          const cx = x(s.t);
          const cy = laneY[s.lane];
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={5} fill={color(s.tone)} />
              <text
                x={cx}
                y={s.lane === 0 ? cy - 12 : cy + 20}
                fontSize={10}
                textAnchor="middle"
                fill={color(s.tone)}
                fontFamily="var(--font-mono)"
              >
                {s.label}
              </text>
            </g>
          );
        })}
        <text x={52} y={146} fontSize={10} fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">
          time →
        </text>
      </svg>
      <p className="mt-2 text-sm text-text-secondary">{verdict}</p>
    </div>
  );
}

export function RaceTimeline() {
  return (
    <div className="my-8 grid gap-4 md:grid-cols-2">
      <Lane
        title="Before: check-then-act"
        steps={before}
        verdict="Both pass the check and both write 100: 101 units used, 100 recorded, no error anywhere."
      />
      <Lane
        title="After: guarded UPDATE"
        steps={after}
        verdict="The database serializes the writes. B's condition fails, so it gets a typed quota error."
      />
    </div>
  );
}
