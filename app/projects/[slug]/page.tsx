import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Link } from "@/components/ViewTransitions";
import {
  getAdjacentProjects,
  getProject,
  projects,
  projectTitleTransition,
} from "@/lib/projects";
import { getCaseStudy } from "@/lib/case-studies";
import { caseTitleTransition } from "@/lib/view-transitions";
import { siteConfig, siteUrl } from "@/lib/site-config";
import { ArchitectureJourney } from "@/components/project/ArchitectureJourney";
import { PermissionPlayground } from "@/components/project/PermissionPlayground";
import { ProjectCreationPlayground } from "@/components/project/ProjectCreationPlayground";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: `${project.title}: architecture walkthrough — ${siteConfig.name}`,
    description: project.tagline,
    openGraph: { title: project.title, description: project.tagline },
  };
}

function Section({
  id,
  index,
  label,
  title,
  children,
}: {
  id: string;
  index: string;
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto mt-28 max-w-6xl scroll-mt-28 border-t border-border pt-10">
      <p className="font-mono text-sm text-text-tertiary">
        <span className="text-accent">{index}</span> / {label}
      </p>
      {title && (
        <h2 className="mt-4 max-w-3xl text-[clamp(1.75rem,4vw,3rem)] leading-[1.05] font-medium tracking-tight text-text-primary">
          {title}
        </h2>
      )}
      <div className="mt-10">{children}</div>
    </section>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const { prev, next } = getAdjacentProjects(slug);
  const studies = project.caseStudies.map(getCaseStudy).filter((s) => s !== undefined);
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.tagline,
    url: `${siteUrl}/projects/${project.slug}`,
    author: { "@type": "Person", name: siteConfig.name },
    keywords: project.stack.join(", "),
  };

  return (
    <main id="main" className="px-6 pt-36 pb-24 md:pt-44">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mx-auto max-w-6xl">
        <Link
          href="/#projects"
          className="inline-block font-mono text-sm text-text-tertiary transition-colors hover:text-accent"
        >
          ← All projects
        </Link>
        <p className="mt-12 font-mono text-sm text-text-tertiary">
          {project.categories.join(" · ")} · {project.period}
        </p>
        <h1
          className="mt-4 max-w-4xl text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95] font-medium tracking-tight text-text-primary"
          style={{ viewTransitionName: projectTitleTransition(project.slug) }}
        >
          {project.title}
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl">{project.tagline}</p>

        <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 font-mono text-sm">
          <div>
            <dt className="text-text-tertiary">Role</dt>
            <dd className="mt-1 text-text-primary">{project.role}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Stack</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {project.stack.map((tag) => (
                <span key={tag} className="border border-border px-2 py-0.5 text-xs text-text-secondary">
                  {tag}
                </span>
              ))}
            </dd>
          </div>
        </dl>

        <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-3">
          {project.metrics.map((m) => (
            <div key={m.label} className="bg-bg p-6">
              <p className="text-5xl font-medium tracking-tight text-accent md:text-6xl">{m.value}</p>
              <p className="mt-3 text-sm text-text-tertiary">{m.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-xs text-text-tertiary">
          Company project: the code is private, so this page covers architecture and behaviour rather than source.
        </p>
      </header>

      <Section id="challenge" index={idx()} label="The challenge">
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {project.challenge.map((c) => (
            <div key={c.title} className="bg-bg-elevated p-6">
              <p className="text-lg font-medium text-text-primary">{c.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="journey" index={idx()} label="Architecture journey" title={project.journeyIntro}>
        <ArchitectureJourney nodes={project.diagram.nodes} edges={project.diagram.edges} steps={project.journey} />
      </Section>

      <Section id="components" index={idx()} label="System components">
        <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {project.components.map((c) => (
            <div key={c.name} className="bg-bg-elevated p-5">
              <dt className="font-mono text-sm text-text-primary">{c.name}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-text-secondary">{c.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="playground" index={idx()} label="Now you drive it" title={project.playgroundIntro}>
        {project.playground === "permission-resolver" ? <PermissionPlayground /> : <ProjectCreationPlayground />}
      </Section>

      {project.nextUp?.length ? (
        <Section id="next" index={idx()} label="What I'd change next">
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
            {project.nextUp.map((c) => (
              <div key={c.title} className="bg-bg-elevated p-6">
                <p className="text-lg font-medium text-text-primary">{c.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{c.body}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {studies.length > 0 && (
        <Section id="deep-dives" index={idx()} label="Deep dives from this project">
          <ul className="border-t border-border">
            {studies.map((s) => (
              <li key={s.slug} className="border-b border-border">
                <Link
                  href={`/work/${s.slug}`}
                  data-cursor="Read"
                  className="group grid gap-2 py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-6"
                >
                  <div>
                    <h3
                      className="text-xl font-medium text-text-primary transition-colors group-hover:text-accent"
                      style={{ viewTransitionName: caseTitleTransition(s.slug) }}
                    >
                      {s.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-text-secondary">{s.excerpt}</p>
                  </div>
                  <span className="font-mono text-xs text-text-tertiary group-hover:text-accent">Read →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {projects.length > 1 && (
        <nav
          aria-label="More projects"
          className={`mx-auto mt-28 grid max-w-6xl gap-px overflow-hidden border border-border bg-border ${prev.slug === next.slug ? "" : "md:grid-cols-2"}`}
        >
          {(prev.slug === next.slug
            ? [{ p: next, label: "Next project →" }]
            : [
                { p: prev, label: "← Previous project" },
                { p: next, label: "Next project →" },
              ]
          ).map(({ p, label }) => (
            <Link
              key={label}
              href={`/projects/${p.slug}`}
              data-cursor="Explore"
              className={`group bg-bg p-8 transition-colors duration-300 hover:bg-surface ${
                label.startsWith("Next") ? "md:text-right" : ""
              }`}
            >
              <p className="font-mono text-xs text-text-tertiary transition-colors group-hover:text-accent">{label}</p>
              <p className="mt-3 text-xl font-medium text-text-primary">{p.title}</p>
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}
