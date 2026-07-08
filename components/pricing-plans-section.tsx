import { CheckCircle2 } from "lucide-react";

import { publicAddOns, publicPlans } from "@/lib/pricing";

export function PricingPlansSection() {
  return (
    <section id="pricing" className="border-b border-white/10 bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200">Subscription plans</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Proper pricing for every ILLCO AI product.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Each app is mapped to a real subscription tier. Product cards show a direct monthly price when the product uses a standard tier,
            a usage quote for API-style products, and custom pricing for private enterprise work.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {publicPlans.map((plan) => (
            <article key={plan.id} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm font-semibold text-cyan-100">{plan.name}</p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight text-white">{plan.priceLabel}</span>
                <span className="pb-1 text-sm font-medium text-slate-400">{plan.cadence}</span>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{plan.audience}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{plan.description}</p>
              <ul className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm leading-5 text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-[14px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Capacity add-ons</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Scale usage without changing the base plan.</h3>
            </div>
            <a
              href="mailto:sales@illcoai.tech?subject=ILLCO%20AI%20subscription%20quote"
              className="inline-flex items-center justify-center rounded-[14px] border border-cyan-400/35 bg-cyan-400/12 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
            >
              Request quote
            </a>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {publicAddOns.map((addOn) => (
              <div key={addOn.name} className="flex items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-slate-950/60 px-4 py-3">
                <span className="text-sm font-medium text-slate-300">{addOn.name}</span>
                <strong className="text-right text-sm text-white">{addOn.priceLabel}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
