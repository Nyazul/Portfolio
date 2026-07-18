const stack = [
  { name: "Java / Spring Boot", level: 90 },
  { name: "PostgreSQL", level: 80 },
  { name: "Apache Kafka", level: 75 },
  { name: "React / TypeScript", level: 70 },
  { name: "Docker", level: 70 },
];

// Phase 1: self-assessed static bars only, labeled as such.
// Phase 4 adds live GitHub data (repo count, language share, contribution
// calendar) via a server-side cached fetch - see PRD Section 9.4. That data
// is intentionally NOT mocked here; an honest "coming soon" beats a fake number.
export function StackMetrics() {
  return (
    <section id="stack" className="section-pad px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-baseline justify-between">
          <h2 className="font-mono text-sm text-text-tertiary">04 / Stack</h2>
          <p className="text-sm text-text-tertiary">
            Live GitHub stats — Phase 4
          </p>
        </div>
        <div className="max-w-2xl space-y-5">
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
        </div>
        <p className="mt-6 max-w-2xl text-xs text-text-tertiary">
          Self-assessed, not derived from any external metric.
        </p>
      </div>
    </section>
  );
}
