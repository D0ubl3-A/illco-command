import type { Metadata } from "next";
import { CheckCircle2, Database, Filter, ShieldCheck } from "lucide-react";

import { LeadCaptureForm } from "@/components/lead-capture-form";
import { NicheLeadCatalog } from "@/components/niche-lead-catalog";

const siteUrl = "https://illcoai.tech";

export const metadata: Metadata = {
  title: "Free B2B Lead Sample and Niche Business Lists",
  description: "Request a free B2B lead sample, browse high-value business niches, and price a licensed niche list scoped by geography and available business-contact fields.",
  alternates: { canonical: `${siteUrl}/free-leads` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Free Lead Sample | ILLCO AI",
    description: "Choose a niche and market, receive a sample, then price the full licensed B2B list.",
    url: `${siteUrl}/free-leads`,
    type: "website",
  },
};

const steps = [
  ["Choose the target", "Tell us the niche, geography, company size, and fields you need."],
  ["Receive a free sample", "We verify current availability and deliver a small sample for fit review."],
  ["Price the full list", "You receive the available record count, field coverage, refresh date, license, and price before buying."],
];

export default function FreeLeadsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_18%_15%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.14),transparent_26%),linear-gradient(180deg,#05080f,#080d17)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Free sample · Full lists for sale</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-[-0.055em] text-white sm:text-7xl">
              Find the exact businesses you want to reach.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Pick a niche and market. We check available licensed B2B records, give you a free sample, and quote the full list with its real record count and field coverage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#free-sample" className="inline-flex min-h-12 items-center rounded-xl bg-emerald-300 px-6 font-black text-slate-950">Get a free lead sample</a>
              <a href="#niches" className="inline-flex min-h-12 items-center rounded-xl border border-white/15 px-6 font-bold text-white">Browse niches</a>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ["No blind purchase", "See a sample before pricing the full list."],
                ["Exact scope", "Niche, geography, size, and fields selected by you."],
                ["Compliance details", "Source category, refresh date, permitted use, and suppression terms disclosed."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <strong className="text-emerald-200">{title}</strong>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <aside id="free-sample" className="rounded-3xl border border-emerald-300/20 bg-slate-900/90 p-6 shadow-2xl shadow-black/40 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Free sample request</p>
            <h2 className="mt-3 text-3xl font-black">Tell us your niche and market.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">In the message, include niche, city/state or nationwide scope, desired fields, and approximate list size.</p>
            <div className="mt-6">
              <LeadCaptureForm serviceId="free-b2b-lead-sample" productName="your free B2B lead sample" buttonLabel="Request my free sample" messagePlaceholder="Example: roofers in Nevada; business name, website, public business phone, and role-based email where available." />
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Submitting requests availability review, not an automatic transfer of personal data. Do not request sensitive, protected, or unlawfully obtained information.</p>
          </aside>
        </div>
      </section>

      <section className="border-b border-white/10 bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          {steps.map(([title, copy], index) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-300 font-black text-slate-950">{index + 1}</span>
              <h2 className="mt-4 text-xl font-black">{title}</h2>
              <p className="mt-2 leading-7 text-slate-400">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <NicheLeadCatalog />

      <section className="border-y border-white/10 bg-slate-900/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-300">Large targeting universe</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight">Thousands of niches. Potentially hundreds of thousands of targeting combinations.</h2>
              <p className="mt-5 leading-8 text-slate-300">The scalable unit is a niche × geography × company-profile request. Availability is checked before sale, so displayed categories are targeting options—not a claim that every combination already contains verified records.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [Database, "Count before purchase", "The quote states the currently available record count."],
                [Filter, "Field-level scope", "Choose available business names, websites, public phones, locations, industries, and business-contact fields."],
                [ShieldCheck, "Licensed delivery", "The order includes use terms and applicable suppression requirements."],
                [CheckCircle2, "Quality disclosure", "Coverage, refresh timing, known limitations, and replacement policy are disclosed before purchase."],
              ].map(([Icon, title, copy]) => {
                const ItemIcon = Icon as typeof Database;
                return <article key={String(title)} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5"><ItemIcon className="h-6 w-6 text-cyan-300" /><h3 className="mt-4 font-black">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{String(copy)}</p></article>;
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-4xl font-black">Sample first. Buy only when the scope fits.</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">Request a sample and list specification. Final pricing depends on verified availability, fields, geography, record volume, recency, and permitted use.</p>
        <a href="#free-sample" className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-emerald-300 px-7 font-black text-slate-950">Request free leads</a>
      </section>
    </main>
  );
}
