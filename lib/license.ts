import crypto from "node:crypto";

import { env, requireEnv } from "@/lib/env";

const signedPrefix = "ILLCO";

export type LicenseValidationOptions = {
  productId?: string | null;
};

export type LicenseValidationResult = {
  ok: boolean;
  message: string;
  source: string | null;
  productId?: string | null;
  email?: string | null;
  seats?: number | null;
  expiresAt?: string | null;
};

function parseKeys(raw: string) {
  return raw
    .split(/[\n,|]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeStringMatch(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function assertAdminRequest(request: Request) {
  const adminApiKey = requireEnv(env.adminApiKey, "ADMIN_API_KEY");
  const provided = request.headers.get("x-admin-api-key") || "";
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(adminApiKey);

  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error("Valid x-admin-api-key is required.");
  }
}

export function issueSignedLicense(input: {
  email: string;
  productId: string;
  seats?: number;
  expiresAt?: string | null;
  issuedAt?: string | null;
  checkoutSessionId?: string | null;
}) {
  const secret = requireEnv(env.licenseSigningSecret, "LICENSE_SIGNING_SECRET");
  const issuedAt = input.issuedAt || new Date().toISOString();
  const payload = {
    email: input.email.toLowerCase(),
    productId: input.productId,
    seats: Math.max(1, Math.floor(input.seats || 1)),
    issuedAt,
    expiresAt: input.expiresAt || null,
    checkoutSessionId: input.checkoutSessionId || null,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);

  return `${signedPrefix}.${encodedPayload}.${signature}`;
}

export function validateLicenseKey(
  candidate: string | null | undefined,
  options: LicenseValidationOptions = {},
): LicenseValidationResult {
  const key = String(candidate || "").trim();
  const requestedProductId = String(options.productId || "").trim();
  if (!key) {
    return { ok: false, message: "License key is required.", source: null };
  }

  if (env.masterLicenseKey && safeStringMatch(key, env.masterLicenseKey)) {
    return {
      ok: true,
      message: requestedProductId
        ? `Master license valid for ${requestedProductId}.`
        : "Master license valid.",
      source: "master",
      productId: requestedProductId || null,
    };
  }

  const configuredKeys = parseKeys(env.licenseKeys);
  if (configuredKeys.some((configuredKey) => safeStringMatch(key, configuredKey))) {
    return {
      ok: true,
      message: requestedProductId
        ? `Configured license valid for ${requestedProductId}.`
        : "Configured license valid.",
      source: "configured",
      productId: requestedProductId || null,
    };
  }

  if (key.startsWith(`${signedPrefix}.`)) {
    const [, payload, signature] = key.split(".");
    if (!payload || !signature || !env.licenseSigningSecret) {
      return { ok: false, message: "Signed license cannot be verified on this server.", source: "signed" };
    }

    const expected = signPayload(payload, env.licenseSigningSecret);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return { ok: false, message: "Signed license signature is invalid.", source: "signed" };
    }

    let decoded: {
      email?: string | null;
      productId?: string | null;
      seats?: number | null;
      expiresAt?: string | null;
    };
    try {
      decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
        email?: string | null;
        productId?: string | null;
        seats?: number | null;
        expiresAt?: string | null;
      };
    } catch {
      return { ok: false, message: "Signed license payload is invalid.", source: "signed" };
    }
    if (requestedProductId && decoded.productId !== requestedProductId) {
      return {
        ok: false,
        message: `Signed license is for ${decoded.productId || "another product"}, not ${requestedProductId}.`,
        source: "signed",
        productId: decoded.productId || null,
      };
    }
    if (decoded.expiresAt && new Date(decoded.expiresAt).getTime() < Date.now()) {
      return {
        ok: false,
        message: "Signed license is expired.",
        source: "signed",
        productId: decoded.productId || null,
        email: decoded.email || null,
        expiresAt: decoded.expiresAt,
      };
    }
    return {
      ok: true,
      message: decoded.productId ? `Signed license valid for ${decoded.productId}.` : "Signed license valid.",
      source: "signed",
      productId: decoded.productId || null,
      email: decoded.email || null,
      seats: decoded.seats || null,
      expiresAt: decoded.expiresAt || null,
    };
  }

  return { ok: false, message: "License key is not valid for this command center.", source: null };
}
