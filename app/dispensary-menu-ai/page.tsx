import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  DatabaseZap,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dispensary Menu Accuracy & Product Discovery AI",
  description:
    "ILLCO AI helps dispensaries catch online-menu and pickup mismatches, then guides adult customers toward products that are actually in stock without making medical claims.",
  alternates: { canonical: "https://illcoai.tech/dispensary-menu-ai" },
  openGraph: {
    title: "Keep Your Online Dispensary Menu Accurate",
    description:
      "Menu-to-inventory monitoring plus age-gated, inventory-grounded product discovery for licensed cannabis retailers.",
    url: "https://illcoai.tech/dispensary-menu-ai",
    type: "website",
  },
};

const mismatchChecks = [
  "Out-of-stock items still accepting pickup orders",
  "Price, size, potency, or variant differences",
  "Substitutions that were not clearly confirmed",
  "Menu changes that have not reached every storefront",
  "Orders that need a final stock check before pickup",
];

const discoveryFeatures = [
  "Search grounded only in the store's live catalog",
  "Filters for format, terpene profile, budget, potency, and desired experience",
  "Clear age gating and configurable compliance language",
  "No diagnosis, treatment promises, or medical advice",
  "Escalation to a budtender when the request needs human judgment",
];

const requestHref = "/?plan=dispensary-menu-ai&source=dispensary-menu-ai#request";

export default function DispensaryMenuAiPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "ILLCO Dispensary Menu Accuracy & Product Discovery AI",
    provider: {
      "@type": "Organization",
      name: "ILLCO AI",
      url: "https://illcoai.tech",
    },
    serviceType: "Cannabis retail menu accuracy and catalog-grounded customer discovery automation",
    areaServed: "US",
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Licensed adult-use cannabis retailers",
    },
    url: "https://illcoai.tech/dispensary-menu-ai",
  };

  return (
    <main id="main-content" className="min-h-screen bg-slate-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_18%,rgba(52,211,153,0.16),transparent_32%),radial-gradient(circle_at_82%_14%,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,#07110d,#030706)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
              <BadgeCheck className="h-4 w-4" />
              For licensed, age-gated cannabis retailers
            </div>
            <h1 className="mt-7 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Keep the online menu and the pickup bag in sync.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
              ILLCO AI monitors the gaps between menu, inventory, order confirmation, and pickup—then helps adult customers discover products that are actually available in the selected store.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href={requestHref}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Request a menu mismatch audit
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href={requestHref}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-6 py-3.5 text-base font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/[0.09]"
              >
                See a short pilot demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "Detect the mismatch",
              text: "Compare menu, inventory, order, and fulfillment data so discrepancies are flagged before the customer arrives.",
              icon: DatabaseZap,
            },
            {
              title: "Confirm what is actually available",
              text: "Add a pre-pickup verification step, substitution workflow, and staff alert when an item or variant changes.",
              icon: RefreshCw,
            },
            {
              title: "Guide discovery from live stock",
              text: "Let adult customers explore the current catalog by format, profile, budget, and desired experience—not stale listings.",
              icon: SearchCheck,
            },
          ].map(({ title, text, icon: Icon }) => (
            <article key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <Icon className="h-7 w-7 text-emerald-300" />
              <h2 className="mt-5 text-xl font-semibold">{title}</h2>
              <p className="mt-3 leading-7 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <article className="rounded-xl border border-white/10 bg-slate-900/70 p-7">
            <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <ShoppingBag className="h-4 w-4" /> Menu Match Monitor
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Catch order problems before pickup.</h2>
            <div className="mt-6 grid gap-3">
              {mismatchChecks.map((item) => (
                <div key={item} className="flex gap-3 text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-white/10 bg-slate-900/70 p-7">
            <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <SearchCheck className="h-4 w-4" /> Product Discovery Assistant
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Recommend from the real catalog, not a generic strain list.</h2>
            <div className="mt-6 grid gap-3">
              {discoveryFeatures.map((item) => (
                <div key={item} className="flex gap-3 text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <ShieldCheck className="mx-auto h-9 w-9 text-emerald-300" />
        <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Start with one store and one live menu.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          We begin with a short workflow and integration review, identify where mismatches enter the order path, and scope a measurable pilot around menu accuracy and customer handoff.
        </p>
        <Link
          href={requestHref}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-emerald-200"
        >
          Request the pilot assessment
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </main>
  );
}
