import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReelWorld GO",
    short_name: "ReelWorld GO",
    description: "A location-based mobile fishing game with camera water scanning, animated fish, gear, permits, and persistent catches.",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    background_color: "#06111a",
    theme_color: "#06111a",
    orientation: "portrait",
    categories: ["games", "sports"],
    icons: [
      {
        src: "/reelworld-go/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
