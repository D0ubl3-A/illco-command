import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iLLCo AI App Store",
    short_name: "iLLCo AI",
    description:
      "Working AI apps, automation systems, creator tools, lead workflows, and managed custom builds from iLLCo AI.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050a12",
    theme_color: "#050a12",
    orientation: "portrait-primary",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
