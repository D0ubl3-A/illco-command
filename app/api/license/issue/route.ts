import { NextResponse } from "next/server";

import { getProductById } from "@/lib/deployments";
import { assertAdminRequest, issueSignedLicense } from "@/lib/license";

export async function POST(request: Request) {
  try {
    assertAdminRequest(request);
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      productId?: string;
      seats?: number;
      expiresAt?: string | null;
    };
    const email = String(body.email || "").trim().toLowerCase();
    const productId = String(body.productId || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ detail: "A valid email is required." }, { status: 400 });
    }
    if (!getProductById(productId)) {
      return NextResponse.json({ detail: "A known productId is required." }, { status: 400 });
    }

    const licenseKey = issueSignedLicense({
      email,
      productId,
      seats: body.seats,
      expiresAt: body.expiresAt || null,
    });

    return NextResponse.json(
      {
        licenseKey,
        productId,
        email,
        seats: Math.max(1, Math.floor(body.seats || 1)),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "License issue failed.";
    const status = message.includes("ADMIN_API_KEY is required")
      ? 503
      : message.includes("x-admin-api-key")
        ? 401
        : 500;
    return NextResponse.json(
      { detail: message },
      { status },
    );
  }
}
