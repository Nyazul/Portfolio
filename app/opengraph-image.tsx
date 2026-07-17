import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0A0A0A",
          padding: "80px",
        }}
      >
        <div style={{ color: "#6B6B6B", fontSize: 28, fontFamily: "monospace" }}>
          {siteConfig.name}
        </div>
        <div
          style={{
            marginTop: 24,
            color: "#F5F5F5",
            fontSize: 64,
            fontWeight: 500,
            maxWidth: 900,
          }}
        >
          {siteConfig.role}
        </div>
        <div style={{ marginTop: 24, color: "#A3A3A3", fontSize: 28, maxWidth: 800 }}>
          {siteConfig.tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
