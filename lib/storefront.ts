import type { ProductRecord } from "@/lib/deployments";
import { getPublicProductPriceLabel } from "@/lib/pricing";
import { getProductViralImagePath } from "@/lib/product-marketing";

export const storefrontCategoryLabels: Record<ProductRecord["category"], string> = {
  command: "Apps",
  media: "Media",
  automation: "Automation",
  commerce: "Commerce",
  realEstate: "Real Estate",
  backend: "Backend",
  experimental: "Labs",
};

export const storefrontCategoryOrder: ProductRecord["category"][] = [
  "command",
  "automation",
  "media",
  "commerce",
  "realEstate",
  "backend",
  "experimental",
];

export const storefrontCategoryDescriptions: Record<ProductRecord["category"], string> = {
  command: "Decision systems, app hubs, and operational tools built to reduce drift.",
  media: "Music, video, voice, and content tools that ship with proof and output paths.",
  automation: "Lead handling, workflow routing, assistants, and repeatable ops systems.",
  commerce: "Checkout surfaces, product access, merch, and conversion systems.",
  realEstate: "Property, local service, and field-ops workflows for real-world work.",
  backend: "APIs, gateways, webhooks, auth services, and infrastructure layers.",
  experimental: "Labs, prototypes, and early-stage tools that are still being shaped.",
};

export function storefrontDisplayName(product: ProductRecord) {
  return product.displayName || product.name;
}

export function storefrontStage(product: ProductRecord) {
  return product.stage || product.updated || "Production";
}

export function storefrontPriceLabel(product: ProductRecord) {
  return getPublicProductPriceLabel(product);
}

export function storefrontRating(product: ProductRecord) {
  return product.isLive ? "4.8" : "4.6";
}

export function storefrontFeaturedProducts(products: ProductRecord[], featuredIds: string[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return featuredIds.map((id) => byId.get(id)).filter(Boolean) as ProductRecord[];
}

export function storefrontProductImage(product: ProductRecord) {
  return product.imageUrl || getProductViralImagePath(product);
}
