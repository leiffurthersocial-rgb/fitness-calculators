import type { MetadataRoute } from "next";
import { ALL_TOOLS } from "@/lib/tools";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vital-fitness.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    ...ALL_TOOLS.map((t) => ({
      url: `${BASE}/t/${t.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
