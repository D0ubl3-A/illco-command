import type { Metadata } from "next";

import { PricingPlansSection } from "@/components/pricing-plans-section";
import { ProductsCatalogClient } from "@/components/products-catalog-client";
import { products } from "@/lib/deployments";

const siteUrl = "https://illcoai.tech";

export const metadata: Metadata = {
  title: "AI App Catalog and Pricing",
  description: "Search the full ILLCO AI app catalog and compare subscription plans, add-ons, categories, access models, and launch paths.",
  alternates: {
    canonical: `${siteUrl}/products`,
  },
  openGraph: {
    title: "AI App Catalog and Pricing | ILLCO AI",
    description: "Search the full ILLCO AI app catalog and compare subscription plans, add-ons, categories, access models, and launch paths.",
    url: `${siteUrl}/products`,
    type: "website",
    images: [
      {
        url: "/media/illco-command-header-loop-poster.jpg",
        width: 1200,
        height: 630,
        alt: "ILLCO AI app catalog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI App Catalog and Pricing | ILLCO AI",
    description: "Search the full ILLCO AI app catalog and compare subscription plans, add-ons, categories, access models, and launch paths.",
    images: ["/media/illco-command-header-loop-poster.jpg"],
  },
};

export default function ProductsPage() {
  return (
    <main id="main-content" className="bg-slate-950">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_18%,rgba(92,241,255,0.12),transparent_30%),radial-gradient(circle_at_84%_10%,rgba(240,178,75,0.1),transparent_25%),linear-gradient(180deg,rgba(5,8,14,0.98),rgba(5,7,11,0.98))]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">Premium AI marketplace</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Browse the full store with live apps and real pricing.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Compare products by subscription tier, category, stage, access path, and launch readiness. Core, Studio, Suite, and Enterprise pricing now applies across the catalog.
            </p>
          </div>
        </div>
      </section>

      <PricingPlansSection />
      <ProductsCatalogClient products={products} />
    </main>
  );
}
