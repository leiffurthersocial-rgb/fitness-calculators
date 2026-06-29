import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Never let the browser serve the (kill-switch) service worker from
        // its HTTP cache, so a device with the old worker always picks up the
        // self-destroying one and un-sticks itself.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
