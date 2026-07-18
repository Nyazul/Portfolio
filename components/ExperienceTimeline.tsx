const experience = [
  {
    role: "Java Software Engineer",
    org: "YSM Infosolution",
    period: "Jun 2025 — Present",
    bullets: [
      "Architected a multi-tenant SaaS backend enforcing strict domain boundaries via named interfaces and event externalization.",
      "Designed a subscription billing system with versioned plan templates and atomic usage tracking under concurrent load.",
      "Built a trigger-based automation engine with event-driven consumers, retry logic, and per-execution log tracking.",
    ],
  },
  {
    role: "Software Engineering Intern",
    org: "YSM Infosolution",
    period: "Jan 2025 — Jun 2025",
    bullets: [
      "Built a 15-entity multi-tenant CRM with property inventory, lead tracking, and disbursement tracking.",
      "Implemented permission-based authorization with 30+ granular permission values plus per-user overrides.",
      "Integrated object storage for document handling: multipart upload, download, and presigned URL generation.",
    ],
  },
];

export function ExperienceTimeline() {
  return (
    <section id="experience" className="section-pad px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 font-mono text-sm text-text-tertiary">
          05 / Experience
        </h2>
        <div className="space-y-16">
          {experience.map((role) => (
            <div
              key={role.role + role.period}
              className="grid gap-4 md:grid-cols-[200px_1fr]"
            >
              <div>
                <p className="text-text-primary">{role.role}</p>
                <p className="text-sm text-text-tertiary">{role.org}</p>
                <p className="mt-1 font-mono text-xs text-text-tertiary">
                  {role.period}
                </p>
              </div>
              <ul className="space-y-3 text-sm leading-normal text-text-secondary">
                {role.bullets.map((bullet) => (
                  <li key={bullet}>— {bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
