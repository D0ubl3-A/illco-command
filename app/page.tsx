import type { Metadata } from "next";

import { CheckoutProductsSection } from "@/components/checkout-products-section";
import { CommandClient } from "@/components/command-client";
import { featuredProductIds, products } from "@/lib/deployments";
import { getConfigurationStatus } from "@/lib/env";
import { getMonetizationPlan } from "@/lib/monetization";

const siteUrl = "https://illcoai.tech";

export const metadata: Metadata = {
  title: "AI Tools Marketplace",
  description:
    "Buy working AI tools, watch proof videos, or request custom AI systems for lead recovery, content, email, and operations.",
  alternates: {
    canonical: siteUrl,
  },
  keywords: [
    "AI tools marketplace",
    "buy AI apps",
    "AI automation tools",
    "custom AI agents",
    "lead recovery AI",
    "AI content production",
  ],
  openGraph: {
    title: "ILLCO AI Tools Marketplace",
    description:
      "Buy working AI tools, watch proof videos, or request custom AI systems for lead recovery, content, email, and operations.",
    url: siteUrl,
    images: [
      {
        url: "/media/illco-command-header-loop-poster.jpg",
        width: 1200,
        height: 630,
        alt: "ILLCO AI command marketplace preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/media/illco-command-header-loop-poster.jpg"],
  },
};

export default function HomePage() {
  const toolsFirstId = "ai-companions-recovered";
  const prioritizedFeaturedProductIds = featuredProductIds.includes(toolsFirstId)
    ? [toolsFirstId, ...featuredProductIds.filter((id) => id !== toolsFirstId)]
    : featuredProductIds;
  const publicProducts = products
    .filter((product) => getMonetizationPlan(product.id)?.publicInFunnel)
    .slice(0, 8);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "ILLCO AI",
        url: siteUrl,
        description:
          "ILLCO AI builds working AI tools, specialist agents, automation systems, and proof-led app funnels.",
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "ILLCO AI Tools Marketplace",
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/?q={search_term_string}#apps`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/#featured-ai-tools`,
        name: "Featured ILLCO AI tools",
        itemListElement: publicProducts.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "SoftwareApplication",
            name: product.displayName,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: `${siteUrl}/apps/${product.id}`,
            offers: {
              "@type": "Offer",
              availability: product.isLive ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
              priceCurrency: "USD",
            },
          },
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What can I buy from ILLCO AI?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You can buy working AI tools, starter access, proof-led app subscriptions, and custom AI system setup.",
            },
          },
          {
            "@type": "Question",
            name: "Can I see proof before buying?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. The landing page leads with proof videos, tutorials, result clips, and app status before checkout or setup requests.",
            },
          },
          {
            "@type": "Question",
            name: "Can I request a custom AI system?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. ILLCO AI offers automation audits, single-agent builds, multi-agent ops systems, Notion workspaces, and AI content production.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CommandClient
        products={products}
        featuredProductIds={prioritizedFeaturedProductIds}
        config={getConfigurationStatus()}
        checkoutProductsSlot={<CheckoutProductsSection />}
      />
    </>
  );
}
