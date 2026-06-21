import { NextResponse } from "next/server";

import { isTrustedAdminEmail } from "@/lib/admin-identities";
import {
  USER_SESSION_COOKIE,
  getAccountDatabaseStatus,
  getCurrentUser,
  isAccountsConfigured,
  listUserPurchases,
  revokeCurrentUserSession,
} from "@/lib/user-accounts";

export async function GET() {
  const status = await getAccountDatabaseStatus();
  if (!status.ready) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      accountsConfigured: status.configured,
      accountsReady: false,
      detail: status.reason,
      accountUrl: "/account",
    });
  }

  try {
    const user = await getCurrentUser();
    const admin = isTrustedAdminEmail(user?.email || null);
    const purchases = user
      ? await listUserPurchases(user).catch(() => [])
      : [];
    const unlockedProductIds = purchases
      .filter((purchase) => purchase.launchEnabled)
      .map((purchase) => purchase.productId);

    return NextResponse.json({
      ok: true,
      authenticated: Boolean(user),
      accountsConfigured: true,
      accountsReady: true,
      accountUrl: "/account",
      watcherUrl: admin ? "/admin#watcher" : null,
      profile: user
        ? {
            status: "active",
            role: admin ? "admin" : "user",
            purchaseCount: purchases.length,
            unlockedProductIds,
          }
        : null,
      productAccess: {
        purchaseCount: purchases.length,
        unlockedProductIds,
      },
      globalLicense: {
        unlocked: admin,
        source: admin ? "admin-account" : null,
      },
      purchases: purchases.map((purchase) => ({
        productId: purchase.productId,
        productName: purchase.productName,
        status: purchase.status,
        launchHref: purchase.launchHref,
        launchEnabled: purchase.launchEnabled,
        launchBlockedReason: purchase.launchBlockedReason,
      })),
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            company: user.company,
            googleLinked: user.googleLinked,
            admin,
            profileStatus: "active",
            purchaseCount: purchases.length,
            unlockedProductIds,
          }
        : null,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      accountsConfigured: true,
      accountsReady: false,
      accountUrl: "/account",
      temporarilyUnavailable: true,
    });
  }
}

export async function POST() {
  try {
    if (isAccountsConfigured()) {
      await revokeCurrentUserSession();
    }
  } catch {
    // Clearing the browser cookie is still the safest outcome if the backing store is unavailable.
  }

  const response = NextResponse.json({
    ok: true,
    authenticated: false,
    accountUrl: "/account",
  });

  response.cookies.set(USER_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}