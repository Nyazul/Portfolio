import { Link } from "@/components/ViewTransitions";
import { otherProjects, projects, projectTitleTransition } from "@/lib/projects";

// Body of the home-page Projects section: the walkthrough projects as large
// cards, then a compact list of smaller things built or shipped. Server
// component.
export function ProjectsList() {
  return (
    <div>
      <p className="mb-6 flex items-center justify-between font-mono text-xs text-text-tertiary">
        <span>Architecture walkthroughs</span>
        <span>{String(projects.length).padStart(2, "0")}</span>
      </p>
      <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.slug}
            href={`/projects/${p.slug}`}
            data-cursor="Explore"
            className="group flex flex-col bg-bg p-6 transition-colors duration-300 hover:bg-surface md:p-8"
          >
            <p className="font-mono text-xs text-text-tertiary">
              {p.categories.join(" · ")}
            </p>
            <h3
              className="mt-4 text-3xl font-medium tracking-tight text-text-primary md:text-4xl"
              style={{ viewTransitionName: projectTitleTransition(p.slug) }}
            >
              {p.title}
            </h3>
            <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-text-secondary">{p.tagline}</p>
            <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
              {p.metrics.map((m) => (
                <div key={m.label}>
                  <dt className="sr-only">{m.label}</dt>
                  <dd className="text-xl font-medium text-accent">{m.value}</dd>
                  <dd className="mt-1 line-clamp-2 text-[11px] leading-snug text-text-tertiary">{m.label}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 font-mono text-xs text-text-secondary transition-colors group-hover:text-accent">
              Walk through the architecture{" "}
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-12 mb-4 font-mono text-xs text-text-tertiary">Also built</p>
      <ul className="border-t border-border">
        {otherProjects.map((p) => (
          <li key={p.title} className="grid gap-2 border-b border-border py-5 md:grid-cols-[1fr_auto] md:gap-6">
            <div>
              <p className="text-text-primary">
                {p.href ? (
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted underline-offset-4 transition-colors hover:text-accent"
                  >
                    {p.title}
                  </a>
                ) : (
                  p.title
                )}
              </p>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-secondary">{p.body}</p>
              <p className="mt-2 font-mono text-[11px] text-text-tertiary">{p.stack.join(" · ")}</p>
            </div>
            <span className="font-mono text-xs text-text-tertiary">{p.period}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
