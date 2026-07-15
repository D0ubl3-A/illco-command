import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, RefreshCcw, ShieldCheck } from "lucide-react";

import { hasDatabase } from "@/lib/db";
import {
  buildDeliveryHref,
  listServiceOrders,
  serviceOrderPriorities,
  serviceOrderProofStatuses,
  serviceOrderStatuses,
  type ServiceOrder,
} from "@/lib/service-orders";
import { isAdminAuthenticated } from "../auth";
import { updateServiceOrderAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fulfillment Orders | ILLCO Admin",
  description: "Protected fulfillment, delivery, metrics, and proof queue.",
  robots: { index: false, follow: false, noarchive: true },
};

function dateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function statusLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function completion(order: ServiceOrder) {
  if (!order.checklist.length) return 0;
  return Math.round((order.checklist.filter((item) => item.done).length / order.checklist.length) * 100);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin");
  const { state } = await searchParams;
  const orders = hasDatabase() ? await listServiceOrders(200) : [];
  const active = orders.filter((order) => !["delivered", "live", "cancelled", "refunded"].includes(order.status));
  const overdue = active.filter((order) => order.dueAt && Date.parse(order.dueAt) < Date.now());
  const proofPending = orders.filter((order) => ["delivered", "live"].includes(order.status) && order.proofStatus === "pending");
  const paid = orders.filter((order) => order.paymentStatus === "paid");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/75">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
              <ShieldCheck className="h-4 w-4" />
              Protected operations
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Fulfillment and proof queue</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Every verified payment becomes a managed order with a due date, owner, delivery checklist, customer portal, measured results, and permission-based proof record.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 font-semibold" href="/admin">Back to operator desk</a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-300 px-4 font-semibold text-slate-950" href="/admin/orders">
              <RefreshCcw className="h-4 w-4" />
              Refresh queue
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {state === "saved" ? <div className="mb-6 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm text-emerald-50">Order updated and customer portal refreshed.</div> : null}
        {state === "missing" ? <div className="mb-6 rounded-xl border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-50">That service order could not be found.</div> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Paid orders" value={paid.length} healthy={paid.length > 0} />
          <Stat label="Active delivery" value={active.length} healthy={active.length > 0} />
          <Stat label="Overdue" value={overdue.length} healthy={overdue.length === 0} />
          <Stat label="Proof requests due" value={proofPending.length} healthy={proofPending.length === 0} />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 sm:px-6 lg:px-8">
        {orders.length ? orders.map((order) => <OrderCard key={order.id} order={order} />) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
            <h2 className="text-xl font-semibold">No service orders yet.</h2>
            <p className="mt-3 text-sm text-slate-400">A verified Lead Recovery or Rank Revival checkout will create the first fulfillment record automatically.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, healthy }: { label: string; value: number; healthy: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <strong className="text-3xl">{value}</strong>
        <span className={`h-3 w-3 rounded-full ${healthy ? "bg-emerald-300" : "bg-amber-300"}`} />
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: ServiceOrder }) {
  const deliveryHref = buildDeliveryHref(order);
  const isLeadRecovery = order.offerId === "lead-recovery-system";
  const progress = completion(order);

  return (
    <article id={order.id} className="scroll-mt-6 rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-xl shadow-black/10 sm:p-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">{statusLabel(order.status)}</span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{statusLabel(order.priority)} priority</span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{order.paymentStatus === "paid" ? "Payment verified" : order.paymentStatus}</span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold">{order.productName}</h2>
          <p className="mt-2 text-sm text-slate-400">
            {order.customerCompany || order.customerName || "Customer"} · {order.customerEmail || "No email"} · {order.amountSummary}
          </p>
          <p className="mt-2 text-xs text-slate-500">{order.id} · Created {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {deliveryHref ? (
            <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 font-semibold" href={deliveryHref} target="_blank" rel="noreferrer">
              Customer portal
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          {order.proofUrl ? (
            <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 font-semibold" href={order.proofUrl} target="_blank" rel="noreferrer">
              Delivery asset
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{progress}% checklist complete · Due {formatDate(order.dueAt)}</p>

      <form action={updateServiceOrderAction} className="mt-7 grid gap-7">
        <input type="hidden" name="orderId" value={order.id} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            Delivery status
            <select className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3" name="status" defaultValue={order.status}>
              {serviceOrderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            Priority
            <select className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3" name="priority" defaultValue={order.priority}>
              {serviceOrderPriorities.map((priority) => <option key={priority} value={priority}>{statusLabel(priority)}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            Delivery owner
            <input className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3" name="ownerEmail" type="email" defaultValue={order.ownerEmail} placeholder="owner@illcoai.tech" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            Due date
            <input className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3" name="dueAt" type="datetime-local" defaultValue={dateTimeInput(order.dueAt)} />
          </label>
        </div>

        <div>
          <h3 className="font-semibold">Delivery checklist</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {order.checklist.map((item) => (
              <label key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                <input className="mt-1 h-4 w-4 accent-cyan-300" type="checkbox" name="doneStep" value={item.id} defaultChecked={item.done} />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isLeadRecovery ? (
            <>
              <MetricInput label="Response time" name="responseTime" value={order.metrics.responseTime} placeholder="22 seconds" />
              <MetricInput label="Recovered leads" name="recoveredLeads" value={order.metrics.recoveredLeads} placeholder="14" />
              <MetricInput label="Appointments booked" name="appointmentsBooked" value={order.metrics.appointmentsBooked} placeholder="6" />
              <MetricInput label="Show rate" name="showRate" value={order.metrics.showRate} placeholder="83%" />
              <MetricInput label="Estimated revenue" name="estimatedRevenue" value={order.metrics.estimatedRevenue} placeholder="$4,800" />
            </>
          ) : (
            <>
              <MetricInput label="Views before" name="viewsBefore" value={order.metrics.viewsBefore} />
              <MetricInput label="Views after" name="viewsAfter" value={order.metrics.viewsAfter} />
              <MetricInput label="CTR before" name="clickThroughRateBefore" value={order.metrics.clickThroughRateBefore} />
              <MetricInput label="CTR after" name="clickThroughRateAfter" value={order.metrics.clickThroughRateAfter} />
              <MetricInput label="Avg duration before" name="averageViewDurationBefore" value={order.metrics.averageViewDurationBefore} />
              <MetricInput label="Avg duration after" name="averageViewDurationAfter" value={order.metrics.averageViewDurationAfter} />
            </>
          )}
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-200">
          Result notes
          <textarea className="min-h-24 rounded-lg border border-white/10 bg-slate-950 px-3 py-3" name="metricsNotes" defaultValue={order.metrics.notes} placeholder="Record context, comparison window, and any limitations." />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            Proof status
            <select className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3" name="proofStatus" defaultValue={order.proofStatus}>
              {serviceOrderProofStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-200 md:col-span-2">
            Delivered asset or proof URL
            <input className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3" name="proofUrl" type="url" defaultValue={order.proofUrl} placeholder="https://..." />
          </label>
        </div>

        {order.proofQuote ? (
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm leading-6 text-amber-50">
            <strong>{order.proofRating || "—"}/5 · {order.proofAttribution || "Customer"}</strong>
            <p className="mt-2">{order.proofQuote}</p>
            <p className="mt-2 text-xs">Publication permission: {order.proofPermission ? "granted" : "not granted"}</p>
          </div>
        ) : null}

        <button className="inline-flex min-h-12 items-center justify-center rounded-lg bg-cyan-300 px-5 font-semibold text-slate-950" type="submit">
          Save delivery record
        </button>
      </form>
    </article>
  );
}

function MetricInput({ label, name, value, placeholder }: { label: string; name: string; value?: string; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-200">
      {label}
      <input className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3" name={name} defaultValue={value} placeholder={placeholder} />
    </label>
  );
}
