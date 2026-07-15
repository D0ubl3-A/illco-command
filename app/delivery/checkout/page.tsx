import { redirect } from "next/navigation";

import { hasDatabase } from "@/lib/db";
import { buildDeliveryHref, upsertServiceOrderFromCheckout } from "@/lib/service-orders";
import { retrieveCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

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
  if (session.payment_status !== "paid" || !session.metadata?.intakeId) {
    redirect(errorPath(offerId, "payment-unverified"));
  }
  if (!hasDatabase()) {
    redirect(errorPath(offerId, "delivery-storage"));
  }

  try {
    const order = await upsertServiceOrderFromCheckout(session);
    const deliveryHref = buildDeliveryHref(order);
    if (!deliveryHref) {
      redirect(errorPath(offerId, "delivery-access"));
    }
    redirect(deliveryHref);
  } catch {
    redirect(errorPath(offerId, "delivery-order"));
  }
}
