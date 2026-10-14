import type { Metadata } from "next";
import Link from "next/link";

const canonical = "https://illcoai.tech/global";
const commercialInquiry = "https://illcoai.com/automation-audit?offer=automation-audit&utm_source=illcoai.tech&utm_medium=referral&utm_campaign=global-services";

export const metadata: Metadata = {
  title: "Global AI Products & Remote Automation | iLLCo AI",
  description:
    "Explore iLLCo AI products, demonstrations, and remote AI automation. Based in Henderson, Nevada, serving Las Vegas, with a Portland regional office. International inquiries are welcome subject to project availability.",
  alternates: { canonical },
  openGraph: {
    title: "Global AI Products & Remote Automation | iLLCo AI",
    description: "Discover AI tools, real demonstrations, and how to request remote automation from iLLCo AI.",
    url: canonical,
    type: "website",
    siteName: "iLLCo AI",
  },
};

const capabilities = [
  {
    title: "AI receptionists and missed-call recovery",
    description: "Explore tools for capturing unanswered calls, responding to prospective customers, and routing inquiries. Setup depends on supported integrations and local requirements.",
    href: "/lead-rescue",
    label: "See the lead recovery workflow",
  },
  {
    title: "AI creative and lyric-video tools",
    description: "Review video and creator tools, demonstrations, and product-specific availability before ordering.",
    href: "/tools/lyric-video-forge",
    label: "Explore lyric-video tools",
  },
  {
    title: "AI automation products",
    description: "Compare available AI apps, access models, and pricing displayed in the product catalog.",
    href: "/products",
    label: "Browse the product catalog",
  },
];

export default function GlobalPage() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl space-y-10 px-5 py-12 text-slate-100 sm:px-8 lg:py-16">
      <header className="max-w-4xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">iLLCo AI · Remote services & digital products</p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">AI products and remote automation for international inquiries</h1>
        <p className="text-lg leading-8 text-slate-300">
          iLLCo AI is headquartered in Henderson, Nevada, USA. Las Vegas is our primary Nevada market,
          and Portland, Oregon is a regional office. We welcome inquiries from businesses outside
          these markets for digital products and remote work where the service, integrations,
          payment method, and legal requirements can be supported.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={commercialInquiry} className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200">Request a commercial automation consultation</a>
          <Link href="/products" className="rounded-lg border border-white/25 px-5 py-3 font-semibold text-white hover:bg-white/10">Explore AI products</Link>
        </div>
      </header>
      <section className="space-y-5" aria-labelledby="global-capabilities">
        <h2 id="global-capabilities" className="text-2xl font-semibold">Explore products and working technical examples</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => (
            <article key={capability.title} className="space-y-3 rounded-xl border border-white/15 bg-white/[0.04] p-5">
              <h3 className="text-xl font-semibold">{capability.title}</h3>
              <p className="leading-7 text-slate-300">{capability.description}</p>
              <Link href={capability.href} className="inline-block font-semibold text-cyan-300 underline underline-offset-4">{capability.label}</Link>
            </article>
          ))}
        </div>
      </section>
      <section className="space-y-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] p-6" aria-labelledby="worldwide-availability">
        <h2 id="worldwide-availability" className="text-2xl font-semibold">What worldwide availability means</h2>
        <p className="leading-7 text-slate-300">Digital inquiries can originate internationally, but not every product, payment route, phone integration, or support arrangement is available in every country. Check the individual product page and confirm scope before paying. Prices, where shown, use the currency displayed at checkout.</p>
        <p className="leading-7 text-slate-300">Commercial proposals, business automation consulting, and service contracts are handled through <a className="font-semibold text-cyan-300 underline" href="https://illcoai.com/">illcoai.com</a>. The technical demonstrations and product catalog are provided here at <Link href="/" className="font-semibold text-cyan-300 underline">illcoai.tech</Link>.</p>
      </section>
      <section className="space-y-4" aria-labelledby="global-proof">
        <h2 id="global-proof" className="text-2xl font-semibold">Verify what a product does</h2>
        <p className="leading-7 text-slate-300">We distinguish demonstrations and test results from verified client outcomes. Product readiness, limitations, and supporting materials are available through the public technical proof center where published.</p>
        <Link href="/audit-proof" className="inline-block font-semibold text-cyan-300 underline underline-offset-4">Visit the technical Proof Center</Link>
      </section>
      <section className="space-y-3 border-t border-white/15 pt-7" aria-labelledby="global-contact">
        <h2 id="global-contact" className="text-2xl font-semibold">Have an international project?</h2>
        <p className="leading-7 text-slate-300">Include your country, time zone, the result you want, and any necessary integrations in your commercial inquiry. We will assess supportability rather than promise an unavailable service.</p>
        <a href={commercialInquiry} className="inline-block font-semibold text-cyan-300 underline underline-offset-4">Start a commercial project inquiry</a>
      </section>
    </main>
  );
}
