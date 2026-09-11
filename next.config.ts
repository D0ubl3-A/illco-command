import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "illcoai.tech" }],
        destination: "https://www.illcoai.tech/:path*",
        permanent: true,
      },
      {
        source: "/play",
        destination: "/apps/reelworld-go",
        permanent: false,
      },
      {
        source: "/scan-benchmark",
        destination: "/apps/reelworld-go/scan-benchmark",
        permanent: false,
      },
      {
        source: "/companions",
        destination: "/tools",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/reelworld-go/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;
