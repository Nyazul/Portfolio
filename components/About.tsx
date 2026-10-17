import { SectionSplit } from "@/components/motion/SectionSplit";
import { sectionShapes } from "@/lib/particle-shapes";
import { SectionHeading } from "@/components/SectionHeading";
import { TODO, isDev, isFilled } from "@/lib/todo";

// "Now" block - what's true this month. Bump NOW_UPDATED whenever it changes
// so the stamp stays honest.
const NOW_UPDATED = "Oct 2026";
const now = [
  {
    label: "Building",
    value: "A multi-tenant workspace platform at YSM Infosolution: billing, permissions, automation.",
  },
  { label: "Studying", value: "M.Sc. Computer Science at Savitribai Phule Pune University." },
  { label: "Exploring", value: `${TODO}: what you're learning or reading right now` },
];

export function About() {
  const visibleNow = isDev ? now : now.filter((n) => isFilled(n.value));

  return (
    <SectionSplit id="about" theme="light" shapePoints={sectionShapes.about}>
      <SectionHeading index="01" label="About" headline="Systems that hold up after the demo." />
      <div className="max-w-2xl space-y-6 text-lg leading-normal text-text-secondary">
        <p>
          I&apos;m a Java engineer at YSM Infosolution, finishing an M.Sc. in
          Computer Science at SPPU. Most of my time goes into a
          multi-tenant workspace platform with its own billing engine,
          permission system, and automation layer — built on a modular
          Spring Boot architecture with Kafka as the backbone between
          domains.
        </p>
        <p>
          I care less about frameworks and more about what breaks under
          load: lost updates in billing, silent constraint violations in
          activity logs, non-deterministic query ordering that looks fine
          in dev and flakes in production. Most of the case studies below
          are about finding and fixing exactly that class of problem.
        </p>
      </div>

      <div className="mt-14">
        <div className="mb-4 flex items-baseline justify-between font-mono text-xs text-text-tertiary">
          <span>Now</span>
          <span>Updated {NOW_UPDATED}</span>
        </div>
        <dl className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
          {visibleNow.map((item) => (
            <div key={item.label} className="bg-bg p-5">
              <dt className="font-mono text-xs text-accent">{item.label}</dt>
              <dd
                className={
                  isFilled(item.value)
                    ? "mt-2 text-sm leading-relaxed text-text-secondary"
                    : "mt-2 border border-dashed border-accent p-2 font-mono text-xs text-accent"
                }
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionSplit>
  );
}
