import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/case-studies";
import { getNotes } from "@/lib/notes";
import { projects } from "@/lib/projects";
import { siteUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
  ];

  const caseStudyRoutes: MetadataRoute.Sitemap = caseStudies.map((study) => ({
    url: `${siteUrl}/work/${study.slug}`,
    changeFrequency: "yearly",
    priority: 0.8,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${siteUrl}/projects/${p.slug}`,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  const notes = getNotes();
  const noteRoutes: MetadataRoute.Sitemap = notes.length
    ? [
        { url: `${siteUrl}/notes`, changeFrequency: "weekly", priority: 0.6 },
        ...notes.map((note) => ({
          url: `${siteUrl}/notes/${note.slug}`,
          lastModified: note.date,
          changeFrequency: "yearly" as const,
          priority: 0.6,
        })),
      ]
    : [];

  return [...staticRoutes, ...projectRoutes, ...caseStudyRoutes, ...noteRoutes];
}
