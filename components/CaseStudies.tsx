import Link from "next/link";
import { caseStudies } from "@/lib/case-studies";

export function CaseStudies() {
  return (
    <section id="work" className="section-pad px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 font-mono text-sm text-text-tertiary">
          03 / Case studies
        </h2>
        <div className="grid gap-px bg-border md:grid-cols-2">
          {caseStudies.map((study) => (
            <Link
              key={study.slug}
              href={`/work/${study.slug}`}
              className="group flex flex-col justify-between bg-bg p-8 transition-colors duration-200 hover:bg-surface"
            >
              <div>
                <h3 className="text-xl font-medium text-text-primary">
                  {study.title}
                </h3>
                <p className="mt-4 text-sm leading-normal text-text-secondary">
                  {study.excerpt}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-2">
                {study.stack.map((tag) => (
                  <span
                    key={tag}
                    className="border border-border px-2 py-1 font-mono text-xs text-text-tertiary"
                  >
                    {tag}
                  </span>
                ))}
                <span className="ml-auto text-sm text-text-tertiary transition-colors duration-200 group-hover:text-text-primary">
                  Read →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
