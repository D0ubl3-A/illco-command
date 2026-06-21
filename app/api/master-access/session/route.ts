import { NextResponse } from "next/server";

import {
  MASTER_ACCESS_COOKIE,
  MASTER_ACCESS_TTL_SECONDS,
  createMasterAccessCookie,
  getMasterUnlockableProducts,
  readMasterAccessSession,
} from "@/lib/master-access";
import { validateLicenseKey } from "@/lib/license";

async function masterAccessPayload(message?: string) {
  const status = await readMasterAccessSession();
  return {
    ok: true,
    available: status.available,
    unlocked: status.unlocked,
    expiresAt: status.expiresAt,
    unlockedCount: status.unlocked ? status.unlockableProducts.length : 0,
    unlockableProducts: status.unlocked ? status.unlockableProducts : [],
    message,
  };
}

export async function GET() {
  return NextResponse.json(await masterAccessPayload());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { licenseKey?: string };
  const validation = validateLicenseKey(body.licenseKey);

  if (!validation.ok || validation.source !== "master") {
    return NextResponse.json(
      await masterAccessPayload(validation.source === "configured" ? "That key is valid for one access path, but it is not the master unlock key." : validation.message),
      { status: 403 },
    );
  }

  const session = createMasterAccessCookie();
  const unlockableProducts = getMasterUnlockableProducts();
  const response = NextResponse.json({
    ok: true,
    available: true,
    unlocked: true,
    expiresAt: session.expiresAt,
    unlockedCount: unlockableProducts.length,
    unlockableProducts,
    message: "Master access unlocked.",
  });
  response.cookies.set(MASTER_ACCESS_COOKIE, session.value, {
    httpOnly: true,
    maxAge: MASTER_ACCESS_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function DELETE() {
  const status = await readMasterAccessSession();
  const response = NextResponse.json({
    ok: true,
    available: status.available,
    unlocked: false,
    expiresAt: null,
    unlockedCount: 0,
    unlockableProducts: [],
    message: "Master access locked.",
  });
  response.cookies.set(MASTER_ACCESS_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
