import { NextResponse } from "next/server";

import { safeAccountReturnTo } from "@/lib/account-return";
import {
  GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
  GOOGLE_OAUTH_RETURN_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
  createGooglePkceChallenge,
  createGooglePkceVerifier,
  getGoogleOAuthCookiePath,
  isGoogleOAuthConfigured,
} from "@/lib/google-oauth";
import { getAccountDatabaseStatus } from "@/lib/user-accounts";

function accountRedirect(request: Request, state: string) {
  return NextResponse.redirect(new URL(`/account?auth=${encodeURIComponent(state)}`, request.url));
}

export async function GET(request: Request) {
  const dbStatus = await getAccountDatabaseStatus();
  if (!dbStatus.ready) {
    return accountRedirect(request, "accounts-unavailable");
  }
  if (!isGoogleOAuthConfigured()) {
    return accountRedirect(request, "google-unavailable");
  }

  const requestUrl = new URL(request.url);
  const returnTo = safeAccountReturnTo(requestUrl.searchParams.get("returnTo"));
  const loginHint = requestUrl.searchParams.get("loginHint");
  const state = createGoogleOAuthState();
  const verifier = createGooglePkceVerifier();
  const authorizationUrl = buildGoogleAuthorizationUrl({
    state,
    codeChallenge: createGooglePkceChallenge(verifier),
    loginHint,
  });
  const response = NextResponse.redirect(authorizationUrl);
  const secure = process.env.NODE_ENV === "production";
  const cookiePath = getGoogleOAuthCookiePath();

  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: cookiePath,
    sameSite: "lax",
    secure,
  });
  response.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: cookiePath,
    sameSite: "lax",
    secure,
  });
  response.cookies.set(GOOGLE_OAUTH_RETURN_COOKIE, returnTo, {
    httpOnly: true,
    maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: cookiePath,
    sameSite: "lax",
    secure,
  });

  return response;
}
