import type { Metadata } from "next";

import { AppStoreClient, type AppStoreProduct, type HelloskipBlogPost } from "@/components/app-store-client";
import {
  checkoutProductCategories,
  checkoutProductCategoryDetails,
  checkoutProducts,
  type CheckoutProductCategory,
} from "@/lib/checkout-products";
import { getCheckoutProductImagePath } from "@/lib/checkout-product-images";
import { getProductById } from "@/lib/deployments";
import { getConfigurationStatus } from "@/lib/env";
import { getMonetizationPlan } from "@/lib/monetization";
import { canDirectCheckoutPublicProduct } from "@/lib/public-checkout";
import { getPublicProductPriceLabel } from "@/lib/pricing";
import { storefrontProductImage } from "@/lib/storefront";

const siteUrl = "https://illcoai.tech";
const storeReturnTo = "https://illco-ai-app-store.vercel.app/";
const skipProfileHref = "https://helloskip.com/b/illco-ai";
const skipBlogHref = "https://helloskip.com/b/illco-ai/blog";

const categoryTheme: Record<CheckoutProductCategory, { accent: string; accent2: string }> = {
  "Command & AI Operators": { accent: "#ff564f", accent2: "#ff9a3d" },
  "Sales & Lead Recovery": { accent: "#4fd19b", accent2: "#27d5c2" },
  "Workflow Automation": { accent: "#f3b24a", accent2: "#ff7e3f" },
  "Music & Audio": { accent: "#8f7cff", accent2: "#f57cae" },
  "Video & Creator Growth": { accent: "#5cf1ff", accent2: "#96f0d0" },
  "Commerce & Stores": { accent: "#f0b24b", accent2: "#5cf1ff" },
  "App Conversion": { accent: "#4ee7f6", accent2: "#8f7cff" },
  "Voice & Memory": { accent: "#f57cae", accent2: "#f3b24a" },
};

const featuredCheckoutIds = new Set([
  "ai-workflow-mastery",
  "full-hd-lyric-videos",
  "instant-lead-rescue-text-back-ai",
  "youtube-rank-revival-ai-pro",
  "ai-music-mastering-pro",
  "custom-build-sprint",
]);

const dedicatedSalesPages: Record<string, string> = {
  "instant-lead-rescue-text-back-ai": "/lead-rescue",
  "youtube-rank-revival-ai-pro": "/youtube-rank-revival",
};

const priorityOfferPrices: Record<string, string> = {
  "instant-lead-rescue-text-back-ai": "$750 setup + $199/mo",
  "youtube-rank-revival-ai-pro": "$50",
};

const priorityOfferTurnaround: Record<string, string> = {
  "instant-lead-rescue-text-back-ai": "7 business days",
  "youtube-rank-revival-ai-pro": "24-72 hours",
};

const helloskipBlogPosts = [
  {
    title: "The Full-Life SaaS Ecosystem Grid (21-40): A Structured Blueprint for the Modern Age",
    date: "Jul 5, 2026",
    topic: "SaaS Systems",
  },
  {
    title: "Is Using Suno AI Cheating? How AI Music Tools Like Suno Are the Autotune of Our Era",
    date: "Jul 4, 2026",
    topic: "AI Music",
  },
  {
    title: "Does the Government See All Your AI Data? Understanding Privacy in the Age of Artificial Intelligence",
    date: "Jul 4, 2026",
    topic: "AI Privacy",
  },
  {
    title: "This Weekend Only: 50% Off Full HD Lyric Videos from iLLCo-Ai!",
    date: "Jul 4, 2026",
    topic: "Offer",
  },
  {
    title: "5 iLLCo-Ai Products for Effortless Automation: Small Biz & Creator Edition",
    date: "Jul 4, 2026",
    topic: "Automation",
  },
  {
    title: "Why Every Artist Needs an SEO Launch Site, Not Just Another Basic Website",
    date: "Jul 4, 2026",
    topic: "Artist SEO",
  },
  {
    title: "Why Is ChatGPT So Slow? Meet Custom Fast-Response GPTs from iLLCo-Ai",
    date: "Jul 4, 2026",
    topic: "Custom GPTs",
  },
  {
    title: "What Is an Agent Swarm? How iLLCo-Ai Deploys AI Teams to Knock Out Massive Projects Fast",
    date: "Jul 4, 2026",
    topic: "Agent Swarms",
  },
  {
    title: "How Solo Entrepreneurs Can Scale Up Using AI: Grow Your Business Without Hiring Staff",
    date: "Jul 4, 2026",
    topic: "Small Business",
  },
  {
    title: "Why Traditional Video Editors Are Overcharging Indie Artists (And How AI Levels the Playing Field)",
    date: "Jul 1, 2026",
    topic: "AI Video",
  },
  {
    title: "From Script to Vocal: How Voicebook AI is Revolutionizing Content Creation Prototyping",
    date: "Jul 1, 2026",
    topic: "Voice AI",
  },
  {
    title: "Need an AI That Answers the Phone for You? Discover the Power of iLLCo-Ai",
    date: "Jun 30, 2026",
    topic: "Phone AI",
  },
] satisfies HelloskipBlogPost[];

export const metadata: Metadata = {
  title: "ILLCO AI App Store | Working AI Apps and Automation Systems",
  description:
    "The ILLCO catalog is now an AI app store: production tools, launchable workflows, creative engines, lead systems, sales assistants, and custom builds in one checkout-ready marketplace.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "ILLCO AI App Store | Working AI Apps and Automation Systems",
    description:
      "Production tools, launchable workflows, creative engines, lead systems, sales assistants, and custom builds in one checkout-ready marketplace.",
    url: siteUrl,
    images: [
      {
        url: "/media/illco-command-header-loop-poster.jpg",
        width: 1200,
        height: 630,
        alt: "ILLCO AI app store",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ILLCO AI App Store",
    description: "Working AI apps, automation systems, creative tools, growth products, and managed builds.",
    images: ["/media/illco-command-header-loop-poster.jpg"],
  },
};

function googleStartHref(returnTo: string) {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  return `/api/account/google/start?${params.toString()}`;
}

function accountHref(returnTo: string) {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  return `/account?${params.toString()}`;
}

function numericPrice(priceLabel: string) {
  const match = priceLabel.match(/[\d,]+/);
  if (!match) return 0;
  return Number.parseInt(match[0].replace(/,/g, ""), 10) || 0;
}

function billingLabel(priceLabel: string) {
  if (/custom|quote|usage|private/i.test(priceLabel)) return "Quote";
  if (/\/mo|month/i.test(priceLabel)) return "Monthly";
  return "One-time";
}

function productCode(name: string) {
  const words = name.match(/[A-Za-z0-9]+/g) || [];
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "IA";
}

function skipProductHref(productName: string) {
  const params = new URLSearchParams();
  params.set("utm_source", "illcoai.tech");
  params.set("utm_medium", "product_crosslink");
  params.set("utm_campaign", "helloskip_marketplace");
  params.set("product", productName);
  return `${skipProfileHref}?${params.toString()}`;
}

function productChips(category: CheckoutProductCategory, subscriptionTier?: string, isLive?: boolean) {
  const firstChip: Record<CheckoutProductCategory, string> = {
    "Command & AI Operators": "Command",
    "Sales & Lead Recovery": "Leads",
    "Workflow Automation": "Automation",
    "Music & Audio": "Audio",
    "Video & Creator Growth": "Video",
    "Commerce & Stores": "Commerce",
    "App Conversion": "Mobile",
    "Voice & Memory": "Voice",
  };

  return [firstChip[category], subscriptionTier || "Store", isLive ? "Live" : "Guided"].slice(0, 3);
}

function bestFor(category: CheckoutProductCategory) {
  const value: Record<CheckoutProductCategory, string> = {
    "Command & AI Operators": "Operating systems",
    "Sales & Lead Recovery": "Revenue recovery",
    "Workflow Automation": "Repeatable ops",
    "Music & Audio": "Release workflows",
    "Video & Creator Growth": "Creator growth",
    "Commerce & Stores": "Digital sales",
    "App Conversion": "App launches",
    "Voice & Memory": "Voice systems",
  };
  return value[category];
}

function toStoreProducts() {
  const config = getConfigurationStatus();

  return checkoutProducts.map((checkoutProduct, index): AppStoreProduct => {
    const offerProduct = getProductById(checkoutProduct.id);
    const appProduct = getProductById(checkoutProduct.appProductId) || offerProduct;
    const displayProduct = offerProduct || appProduct;
    const defaultPriceLabel = displayProduct ? getPublicProductPriceLabel(displayProduct) : "Custom";
    const priceLabel = priorityOfferPrices[checkoutProduct.id] || defaultPriceLabel;
    const theme = categoryTheme[checkoutProduct.category];
    const featured = featuredCheckoutIds.has(checkoutProduct.id) || index < 4;
    const plan = appProduct ? getMonetizationPlan(appProduct.id) : null;
    const paymentConfigured = Boolean(plan && config.subscriptionsReady && config.planPrices[plan.funnelPlanId]);
    const directCheckoutReady = Boolean(appProduct && plan && paymentConfigured && canDirectCheckoutPublicProduct(appProduct.id));
    const purchaseMode = dedicatedSalesPages[checkoutProduct.id]
      ? "book-service"
      : directCheckoutReady
        ? "direct-buy"
        : "quote-only";

    return {
      id: checkoutProduct.id,
      title: checkoutProduct.name,
      category: checkoutProduct.category,
      categoryDescription: checkoutProductCategoryDetails[checkoutProduct.category],
      price: numericPrice(priceLabel),
      priceLabel,
      billing: billingLabel(priceLabel),
      badge: featured ? "Featured" : appProduct?.isLive ? "Live lane" : "Guided",
      summary: checkoutProduct.summary,
      chips: productChips(checkoutProduct.category, appProduct?.subscriptionTier, appProduct?.isLive),
      details: [
        { label: "Best for", value: bestFor(checkoutProduct.category) },
        { label: "Includes", value: productChips(checkoutProduct.category, appProduct?.subscriptionTier, appProduct?.isLive).slice(0, 2).join(" + ") },
        { label: "Turnaround", value: priorityOfferTurnaround[checkoutProduct.id] || (appProduct?.isLive ? "Ready lane" : "Guided setup") },
      ],
      featured,
      accent: theme.accent,
      accent2: theme.accent2,
      code: productCode(checkoutProduct.name),
      image: displayProduct ? storefrontProductImage(displayProduct) : getCheckoutProductImagePath(checkoutProduct),
      appHref: dedicatedSalesPages[checkoutProduct.id] || `/apps/${encodeURIComponent(displayProduct?.id || checkoutProduct.id)}`,
      skipHref: skipProductHref(checkoutProduct.name),
      purchaseMode,
      checkoutProductId: appProduct?.id,
      checkoutPlanId: plan?.funnelPlanId,
    };
  });
}

export default function HomePage() {
  const storeProducts = toStoreProducts();
  const categories = checkoutProductCategories.map((category) => {
    const theme = categoryTheme[category];
    return {
      name: category,
      description: checkoutProductCategoryDetails[category],
      count: checkoutProducts.filter((product) => product.category === category).length,
      accent: theme.accent,
      accent2: theme.accent2,
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "ILLCO AI",
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "ILLCO AI App Store",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/#featured-apps`,
        name: "Featured ILLCO AI apps",
        itemListElement: storeProducts.slice(0, 12).map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "SoftwareApplication",
            name: product.title,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: `${siteUrl}${product.appHref}`,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AppStoreClient
        products={storeProducts}
        categories={categories}
        accountHref={accountHref(storeReturnTo)}
        googleHref={googleStartHref(storeReturnTo)}
        skipProfileHref={skipProfileHref}
        skipBlogHref={skipBlogHref}
        skipBlogPosts={helloskipBlogPosts}
      />
    </>
  );
}
