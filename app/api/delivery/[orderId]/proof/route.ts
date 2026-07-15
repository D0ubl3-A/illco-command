import { NextResponse } from "next/server";

import { sendServiceOrderEvent } from "@/lib/service-order-events";
import { submitServiceOrderProof } from "@/lib/service-orders";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

function deliveryUrl(request: Request, orderId: string, token: string, proof: "received" | "error") {
  const url = new URL(`/delivery/${encodeURIComponent(orderId)}`, request.url);
  url.searchParams.set("token", token);
  url.searchParams.set("proof", proof);
  return url;
}

export async function GET() {
  return NextResponse.json({ detail: "Feedback submissions require POST." }, { status: 405, headers: { Allow: "POST" } });
}

export async function POST(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const formData = await request.formData().catch(() => null);
  const token = String(formData?.get("token") || "").trim();
  const rating = Number(formData?.get("rating") || 0);
  const quote = String(formData?.get("quote") || "").trim();
  const attribution = String(formData?.get("attribution") || "").trim();
  const metricsNotes = String(formData?.get("metricsNotes") || "").trim();
  const permission = String(formData?.get("permission") || "").trim() === "yes";

  try {
    const updated = await submitServiceOrderProof(orderId, token, {
      rating,
      quote,
      attribution,
      permission,
      metrics: metricsNotes ? { notes: metricsNotes } : undefined,
    });
    try {
      await sendServiceOrderEvent(updated, "proof-received");
    } catch (error) {
      console.error("Proof notification failed", error);
    }
    return NextResponse.redirect(deliveryUrl(request, orderId, token, "received"), 303);
  } catch {
    return NextResponse.redirect(deliveryUrl(request, orderId, token, "error"), 303);
  }
}
