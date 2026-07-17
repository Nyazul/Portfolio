import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/case-studies";
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

  return [...staticRoutes, ...caseStudyRoutes];
}
