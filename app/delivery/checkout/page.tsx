import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import { hasDatabase } from "@/lib/db";
import { buildDeliveryHref, upsertServiceOrderFromCheckout } from "@/lib/service-orders";
import { retrieveCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preparing ILLCO Delivery",
  description: "Secure post-payment delivery handoff.",
  robots: { index: false, follow: false, noarchive: true },
};

type PageProps = {
  searchParams: Promise<{ session_id?: string; offer?: string }>;
};

function salesPath(offer: string) {
  return offer === "youtube-rank-revival-ai-pro" ? "/youtube-rank-revival" : "/lead-rescue";
}

function errorPath(offer: string, reason: string) {
  const url = new URL(salesPath(offer), "https://illcoai.tech");
  url.searchParams.set("checkout", "error");
  url.searchParams.set("reason", reason);
  url.hash = "intake";
  return `${url.pathname}${url.search}${url.hash}`;
}

export default async function DeliveryCheckoutPage({ searchParams }: PageProps) {
  const { session_id: sessionId, offer: requestedOffer } = await searchParams;
  const normalizedSessionId = String(sessionId || "").trim();
  const fallbackOffer = String(requestedOffer || "").trim();

  if (!normalizedSessionId.startsWith("cs_")) {
    redirect(errorPath(fallbackOffer, "missing-session"));
  }

  let session;
  try {
    session = await retrieveCheckoutSession(normalizedSessionId);
  } catch {
    redirect(errorPath(fallbackOffer, "invalid-session"));
  }

  const offerId = String(session.metadata?.offerId || fallbackOffer || "").trim();
  const supported = offerId === "lead-recovery-system" || offerId === "youtube-rank-revival-ai-pro";
  if (!supported) {
    redirect(errorPath(offerId, "unsupported-offer"));
  }
  if (session.payment_status !== "paid") {
    redirect(errorPath(offerId, "payment-unverified"));
  }
  if (!session.metadata?.intakeId) {
    return <PaidRecovery sessionId={session.id} offerId={offerId} reason="The payment is verified, but its intake link is missing." />;
  }
  if (!hasDatabase()) {
    return <PaidRecovery sessionId={session.id} offerId={offerId} reason="The payment is verified, but delivery storage is temporarily unavailable." />;
  }

  try {
    const order = await upsertServiceOrderFromCheckout(session);
    const deliveryHref = buildDeliveryHref(order);
    if (!deliveryHref) {
      return <PaidRecovery sessionId={session.id} offerId={offerId} reason="The payment is verified, but the private delivery link could not be issued." />;
    }
    redirect(deliveryHref);
  } catch {
    return <PaidRecovery sessionId={session.id} offerId={offerId} reason="The payment is verified, but the delivery record is still being prepared." />;
  }
}

function PaidRecovery({ sessionId, offerId, reason }: { sessionId: string; offerId: string; reason: string }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white sm:px-6">
      <section className="mx-auto max-w-2xl rounded-2xl border border-amber-300/25 bg-slate-900/85 p-6 shadow-2xl shadow-black/30 sm:p-9">
        <div className="flex items-start gap-4">
          <ShieldAlert className="mt-1 h-7 w-7 shrink-0 text-amber-300" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Payment protected</p>
            <h1 className="mt-2 text-3xl font-semibold">Do not submit another payment.</h1>
          </div>
        </div>
        <div className="mt-7 flex gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-50">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>Stripe confirmed the payment for {offerId === "youtube-rank-revival-ai-pro" ? "YouTube Rank Revival AI Pro" : "ILLCO Lead Recovery System"}.</span>
        </div>
        <p className="mt-6 text-sm leading-7 text-slate-300">{reason} ILLCO can recover the delivery record from the verified Stripe session below.</p>
        <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Payment reference</p>
          <p className="mt-2 break-all font-mono text-sm text-slate-200">{sessionId}</p>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a className="inline-flex min-h-12 items-center justify-center rounded-lg bg-cyan-300 px-5 font-semibold text-slate-950" href="/support">
            Contact ILLCO support
          </a>
          <a className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/15 px-5 font-semibold" href={salesPath(offerId)}>
            Return to product page
          </a>
        </div>
      </section>
    </main>
  );
}
