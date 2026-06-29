import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vital — Health & Fitness Hub",
    short_name: "Vital",
    description:
      "A suite of clean, science-based health & fitness calculators — strength, cardio, nutrition and recovery — all in your browser.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#059669",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
