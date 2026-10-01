"use client";

import { useMemo, useState } from "react";

const nicheGroups = {
  "Home services": ["HVAC contractors","Plumbers","Electricians","Roofers","Solar installers","Landscapers","Lawn care","Pool services","Pest control","General contractors","Painters","Flooring contractors","Window installers","Garage door companies","Restoration companies","Cleaning services","Junk removal","Moving companies","Locksmiths","Appliance repair"],
  "Health and wellness": ["Dentists","Orthodontists","Chiropractors","Physical therapists","Med spas","Dermatologists","Optometrists","Veterinarians","Mental health practices","Addiction treatment centers","Home healthcare","Senior living","Assisted living","Fitness studios","Personal trainers","Nutritionists","Massage therapists","Acupuncturists"],
  "Professional services": ["Law firms","Accountants","Bookkeepers","Tax preparers","Insurance agencies","Financial advisors","Mortgage brokers","Real estate brokerages","Property managers","Recruiting firms","Staffing agencies","Business consultants","Marketing agencies","IT service providers","Cybersecurity firms","Managed service providers","Architects","Engineering firms"],
  "Automotive and industrial": ["Auto repair shops","Auto dealerships","Tire shops","Auto detailers","Towing companies","Body shops","Fleet operators","Trucking companies","Logistics providers","Warehouses","Manufacturers","Machine shops","Welders","Equipment rental","Commercial contractors","Packaging companies"],
  "Hospitality and retail": ["Restaurants","Bars","Coffee shops","Hotels","Event venues","Caterers","Wedding vendors","Florists","Jewelry stores","Furniture stores","Beauty salons","Barbershops","Spas","Boutiques","Pet groomers","Childcare centers"],
  "B2B and technology": ["SaaS companies","E-commerce brands","Software developers","AI automation companies","Web design agencies","Cloud consultancies","Telecom providers","Payment processors","Commercial printers","Office suppliers","Security companies","Training providers","Franchises","Wholesale distributors","Importers","Exporters"],
} as const;

type NicheGroup = keyof typeof nicheGroups;

export function NicheLeadCatalog() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const groups = useMemo(() => Object.entries(nicheGroups).map(([group, niches]) => ({
    group: group as NicheGroup,
    niches: niches.filter((niche) => !normalized || niche.toLowerCase().includes(normalized) || group.toLowerCase().includes(normalized)),
  })).filter((entry) => entry.niches.length), [normalized]);

  const visibleCount = groups.reduce((total, group) => total + group.niches.length, 0);

  return (
    <section id="niches" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Search the niche catalog</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Start specific. Scale by market.</h2>
          <p className="mt-4 text-slate-300">The directory below shows popular starting niches. Each can be scoped by city, county, state, business size, and available business-contact fields.</p>
        </div>
        <label className="block w-full max-w-md text-sm font-bold text-slate-200">
          Search niches
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try roofing, dentists, SaaS..." className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-900 px-4 text-white" />
        </label>
      </div>
      <p className="mt-5 text-sm text-slate-400" aria-live="polite">{visibleCount} catalog niches shown. Custom niches and larger niche × geography requests are available after source and availability review.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(({ group, niches }) => (
          <article key={group} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-black text-white">{group}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {niches.map((niche) => <a key={niche} href="#free-sample" className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-sm text-cyan-50 hover:bg-cyan-300/10">{niche}</a>)}
            </div>
          </article>
        ))}
      </div>
      {!groups.length ? <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-8 text-center text-slate-300">That niche is not displayed yet. Request it below and we will check availability.</div> : null}
    </section>
  );
}
