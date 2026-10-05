import { ImageResponse } from "next/og";

export const alt = "Fitness Calculators — science-based hypertrophy & fitness tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#23262b",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#e1301f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 900,
            }}
          >
            V
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, opacity: 0.9 }}>Vital</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>
          Science-based health &amp; fitness calculators
        </div>
        <div style={{ marginTop: 24, fontSize: 30, opacity: 0.8 }}>
          Strength · cardio · nutrition · recovery — free &amp; private
        </div>
      </div>
    ),
    size
  );
}
