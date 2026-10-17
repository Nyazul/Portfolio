import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Generated monogram favicon - same palette as app/opengraph-image.tsx,
// with the accent as a single status dot so it reads at 16px.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
          borderRadius: 14,
          color: "#F5F5F5",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: -1,
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        NA
        <div
          style={{
            position: "absolute",
            right: 9,
            bottom: 9,
            width: 9,
            height: 9,
            borderRadius: 9,
            background: "#FF6B2C",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
