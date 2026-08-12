import "@/lib/server-only";

import { NextResponse } from "next/server";

import { validateLicenseKey, type LicenseValidationResult } from "@/lib/license";

export const LABEL_COMMAND_PRODUCT_ID = "label-command";
export const LABEL_COMMAND_ACCESS_COOKIE = "illco_label_command_access";

function readCookie(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [cookieName, ...valueParts] = part.trim().split("=");
    if (cookieName === name) {
      try {
        return decodeURIComponent(valueParts.join("="));
      } catch {
        return valueParts.join("=");
      }
    }
  }
  return "";
}

export function validateLabelCommandAccess(request: Request): LicenseValidationResult {
  const cookieKey = readCookie(request, LABEL_COMMAND_ACCESS_COOKIE);
  const headerKey = request.headers.get("x-label-command-license") || "";
  return validateLicenseKey(cookieKey || headerKey, { productId: LABEL_COMMAND_PRODUCT_ID });
}

export function labelCommandAccessRequiredResponse(result?: LicenseValidationResult) {
  return NextResponse.json(
    {
      ok: false,
      accessRequired: true,
      productId: LABEL_COMMAND_PRODUCT_ID,
      error: result?.message || "An active Label Command trial or paid license is required.",
      accessUrl: "/label-command/access",
    },
    {
      status: 402,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}

export function requireLabelCommandAccess(request: Request) {
  const result = validateLabelCommandAccess(request);
  if (!result.ok) {
    return { ok: false as const, result, response: labelCommandAccessRequiredResponse(result) };
  }
  return { ok: true as const, result };
}

export function setLabelCommandAccessCookie(response: NextResponse, licenseKey: string, result: LicenseValidationResult) {
  const expiresAt = result.expiresAt ? new Date(result.expiresAt) : null;
  response.cookies.set(LABEL_COMMAND_ACCESS_COOKIE, licenseKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    ...(expiresAt && Number.isFinite(expiresAt.getTime())
      ? { expires: expiresAt }
      : { maxAge: 60 * 60 * 24 * 30 }),
  });
}

export function clearLabelCommandAccessCookie(response: NextResponse) {
  response.cookies.set(LABEL_COMMAND_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
}
