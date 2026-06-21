import { NextResponse } from "next/server";

import { validateLicenseKey } from "@/lib/license";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { licenseKey?: string; productId?: string };
  const result = validateLicenseKey(body.licenseKey, {
    productId: typeof body.productId === "string" ? body.productId.trim() : "",
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 403 });
}
