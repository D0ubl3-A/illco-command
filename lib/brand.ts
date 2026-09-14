export const BRAND = {
  name: "Nexora AI",
  shortName: "Nexora",
  storeName: "Nexora AI",
  tagline: "Practical AI apps and automation that get work done.",
  description:
    "Nexora AI delivers working AI apps, business automation systems, creator tools, lead workflows, and managed custom builds.",
  ogDescription:
    "Working AI apps, business automation systems, creator tools, lead workflows, and managed builds.",
  experimental: true,
} as const;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
