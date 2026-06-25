import type { Metadata } from "next";

import { CommandClient } from "@/components/command-client";
import { CheckoutProductsSection } from "@/components/checkout-products-section";
import { featuredProductIds, products } from "@/lib/deployments";
import { getConfigurationStatus } from "@/lib/env";

export const metadata: Metadata = {
  title: "Commander",
  description: "Browse the ILLCO Command app catalog, checkout-ready products, setup paths, and proof-led modules.",
  alternates: {
    canonical: "/commander",
  },
};

export default function CommanderPage() {
  const toolsFirstId = "ai-companions-recovered";
  const prioritizedFeaturedProductIds = featuredProductIds.includes(toolsFirstId)
    ? [toolsFirstId, ...featuredProductIds.filter((id) => id !== toolsFirstId)]
    : featuredProductIds;

  return (
    <CommandClient
      products={products}
      featuredProductIds={prioritizedFeaturedProductIds}
      config={getConfigurationStatus()}
      checkoutProductsSlot={<CheckoutProductsSection />}
    />
  );
}
