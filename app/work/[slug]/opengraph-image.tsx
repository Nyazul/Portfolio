import { ImageResponse } from "next/og";
import { caseStudies, getCaseStudy } from "@/lib/case-studies";
import { siteConfig } from "@/lib/site-config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  const title = study?.title ?? siteConfig.name;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0A0A",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 14, height: 14, borderRadius: 14, background: "#FF6B2C" }} />
          <div style={{ color: "#6B6B6B", fontSize: 26, fontFamily: "monospace" }}>
            Case study — {siteConfig.name}
          </div>
        </div>
        <div style={{ color: "#F5F5F5", fontSize: 72, fontWeight: 500, lineHeight: 1.05, maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {(study?.stack ?? []).map((tag) => (
            <div
              key={tag}
              style={{
                color: "#A3A3A3",
                fontSize: 24,
                border: "1px solid #2A2A2A",
                padding: "6px 14px",
                fontFamily: "monospace",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
