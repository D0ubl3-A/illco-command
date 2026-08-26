import { NextResponse } from "next/server";

import {
  clearLabelCommandAccessCookie,
  LABEL_COMMAND_PRODUCT_ID,
  setLabelCommandAccessCookie,
  validateLabelCommandAccess,
} from "@/lib/label-command-access";
import { validateLicenseKey } from "@/lib/license";
import { isSameOriginRequest } from "@/lib/same-origin-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const result = validateLabelCommandAccess(request);
  return NextResponse.json(
    {
      ok: result.ok,
      active: result.ok,
      productId: LABEL_COMMAND_PRODUCT_ID,
      source: result.source,
      email: result.email || null,
      expiresAt: result.expiresAt || null,
      message: result.message,
    },
    {
      status: result.ok ? 200 : 402,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Cross-origin activation rejected." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  let licenseKey = "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { licenseKey?: string };
    licenseKey = String(body.licenseKey || "").trim();
  } else {
    const form = await request.formData().catch(() => null);
    licenseKey = String(form?.get("licenseKey") || "").trim();
  }

  const result = validateLicenseKey(licenseKey, { productId: LABEL_COMMAND_PRODUCT_ID });
  if (!result.ok) {
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL("/label-command/access?error=invalid", request.url), 303);
    }
    return NextResponse.json(
      { ok: false, accessRequired: true, productId: LABEL_COMMAND_PRODUCT_ID, error: result.message },
      { status: 403 },
    );
  }

  if (!contentType.includes("application/json")) {
    const response = NextResponse.redirect(new URL("/label-command/onboarding?access=active", request.url), 303);
    setLabelCommandAccessCookie(response, licenseKey, result);
    return response;
  }

  const response = NextResponse.json({
    ok: true,
    active: true,
    productId: LABEL_COMMAND_PRODUCT_ID,
    source: result.source,
    email: result.email || null,
    expiresAt: result.expiresAt || null,
  });
  setLabelCommandAccessCookie(response, licenseKey, result);
  return response;
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Cross-origin access reset rejected." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true, active: false, productId: LABEL_COMMAND_PRODUCT_ID });
  clearLabelCommandAccessCookie(response);
  return response;
}
