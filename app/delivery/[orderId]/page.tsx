import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Clock3, ExternalLink, ShieldCheck, Star } from "lucide-react";

import { getPublicServiceOrder } from "@/lib/service-orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ILLCO Delivery Status",
  description: "Private delivery status and proof workspace for an ILLCO service order.",
  robots: { index: false, follow: false, noarchive: true, noimageindex: true },
};

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string; proof?: string }>;
};

const statusLabels = {
  "payment-pending": "Payment pending",
  onboarding: "Onboarding",
  building: "In production",
  qa: "Quality assurance",
  delivered: "Delivered",
  live: "Live and managed",
  blocked: "Waiting on an input",
  cancelled: "Cancelled",
  refunded: "Refunded",
} as const;

function formatDate(value: string | null) {
  if (!value) return "To be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "To be confirmed";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function metricRows(metrics: Record<string, string | undefined>) {
  const labels: Record<string, string> = {
    responseTime: "Response time",
    recoveredLeads: "Recovered leads",
    appointmentsBooked: "Appointments booked",
    showRate: "Show rate",
    estimatedRevenue: "Estimated recovered revenue",
    viewsBefore: "Views before",
    viewsAfter: "Views after",
    clickThroughRateBefore: "CTR before",
    clickThroughRateAfter: "CTR after",
    averageViewDurationBefore: "Average view duration before",
    averageViewDurationAfter: "Average view duration after",
  };
  return Object.entries(metrics)
    .filter(([key, value]) => key !== "notes" && Boolean(value))
    .map(([key, value]) => ({ label: labels[key] || key, value: String(value) }));
}

export default async function DeliveryPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { token = "", proof = "" } = await searchParams;
  const order = await getPublicServiceOrder(orderId, token);
  if (!order) notFound();

  const completed = order.checklist.filter((item) => item.done).length;
  const total = Math.max(order.checklist.length, 1);
  const progress = Math.round((completed / total) * 100);
  const metrics = metricRows(order.metrics);
  const proofAvailable = order.status === "delivered" || order.status === "live";
  const proofSubmitted = ["received", "approved", "published"].includes(order.proofStatus);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.15),transparent_32%),linear-gradient(180deg,#070b12,#03050a)]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                <ShieldCheck className="h-4 w-4" />
                Private customer delivery portal
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl">{order.productName}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                {order.customerCompany || order.customerName || "Customer order"} · {order.amountSummary}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 lg:min-w-72">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current status</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-200">{statusLabels[order.status]}</p>
              <p className="mt-2 text-sm text-slate-400">Target: {formatDate(order.dueAt)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.25fr_.75fr] lg:px-8 lg:py-14">
        <section className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Delivery checklist</p>
              <h2 className="mt-2 text-2xl font-semibold">Visible progress from payment to result.</h2>
            </div>
            <div className="text-sm text-slate-400">{completed}/{order.checklist.length} complete</div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800" aria-label={`${progress}% complete`}>
            <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-7 grid gap-3">
            {order.checklist.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
                )}
                <span className={item.done ? "text-slate-200" : "text-slate-400"}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="grid content-start gap-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Order details</p>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Order</dt>
                <dd className="mt-1 break-all text-slate-200">{order.id}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Payment</dt>
                <dd className="mt-1 text-slate-200">{order.paymentStatus === "paid" ? "Verified" : order.paymentStatus}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last updated</dt>
                <dd className="mt-1 text-slate-200">{formatDate(order.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Delivery owner</dt>
                <dd className="mt-1 text-slate-200">{order.ownerEmail || "ILLCO operations"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-cyan-200">
              <Clock3 className="h-5 w-5" />
              <h2 className="font-semibold">What happens next</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              ILLCO updates this page as work moves through onboarding, production, quality assurance, delivery, and proof collection. Save this private link.
            </p>
            {order.proofUrl ? (
              <a className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-300 px-4 font-semibold text-slate-950" href={order.proofUrl} target="_blank" rel="noreferrer">
                Open delivered asset
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </section>
        </aside>
      </div>

      {metrics.length || order.metrics.notes ? (
        <section className="border-y border-white/10 bg-white/[0.025]">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Measured outcome</p>
            <h2 className="mt-2 text-2xl font-semibold">Results recorded for this delivery.</h2>
            {metrics.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {order.metrics.notes ? <p className="mt-6 max-w-4xl text-sm leading-7 text-slate-300">{order.metrics.notes}</p> : null}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <Star className="mt-1 h-6 w-6 shrink-0 text-amber-300" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Proof and feedback</p>
              <h2 className="mt-2 text-2xl font-semibold">Document the real result without inventing claims.</h2>
            </div>
          </div>

          {proof === "received" ? (
            <div className="mt-6 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm text-emerald-50" role="status">
              Feedback received. ILLCO will only publish it when permission was granted and the result can be represented accurately.
            </div>
          ) : null}

          {proofSubmitted ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-6 text-slate-300">
              Feedback is on file. Publication status: <strong className="text-white">{order.proofStatus}</strong>.
            </div>
          ) : proofAvailable ? (
            <form className="mt-7 grid gap-4" action={`/api/delivery/${encodeURIComponent(order.id)}/proof`} method="post">
              <input type="hidden" name="token" value={token} />
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                Overall rating
                <select className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white" name="rating" defaultValue="5" required>
                  <option value="5">5 — Excellent</option>
                  <option value="4">4 — Good</option>
                  <option value="3">3 — Satisfactory</option>
                  <option value="2">2 — Needs improvement</option>
                  <option value="1">1 — Poor</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                What changed or improved?
                <textarea className="min-h-32 rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-white" name="quote" minLength={10} maxLength={1600} required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                Attribution name or business
                <input className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white" name="attribution" maxLength={220} defaultValue={order.customerCompany || order.customerName} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                Result metrics or context <span className="text-xs font-normal text-slate-500">Optional</span>
                <textarea className="min-h-24 rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-white" name="metricsNotes" maxLength={1200} placeholder="Example: 6 recovered calls, 3 appointments, or CTR before and after." />
              </label>
              <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                <input className="mt-1 h-4 w-4 accent-cyan-300" type="checkbox" name="permission" value="yes" />
                <span>ILLCO may publish this feedback with the attribution above. Leaving this unchecked keeps the feedback private.</span>
              </label>
              <button className="inline-flex min-h-12 items-center justify-center rounded-lg bg-cyan-300 px-5 font-semibold text-slate-950" type="submit">
                Submit verified feedback
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm leading-6 text-slate-400">The feedback form opens after the order reaches delivered or live status.</p>
          )}
        </div>
      </section>
    </main>
  );
}
