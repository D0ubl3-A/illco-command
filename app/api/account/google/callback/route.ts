import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { safeAccountReturnTo } from "@/lib/account-return";
import {
  GOOGLE_OAUTH_RETURN_COOKIE,
  GOOGLE_OAUTH_MODE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  exchangeGoogleAuthorizationCode,
  fetchGoogleAccountProfile,
  getGoogleOAuthCookiePaths,
  isGoogleOAuthConfigured,
} from "@/lib/google-oauth";
import { createUserSessionCookieValue, setUserSessionCookieOnResponse } from "@/lib/user-session-cookie";
import { getAccountDatabaseStatus, upsertGoogleUserAccount } from "@/lib/user-accounts";

function accountUrl(request: Request, state: string) {
  return new URL(`/account?auth=${encodeURIComponent(state)}`, request.url);
}

function clearOauthCookies(response: NextResponse) {
  for (const path of getGoogleOAuthCookiePaths()) {
    const options = {
      httpOnly: true,
      maxAge: 0,
      path,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", options);
    response.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, "", options);
    response.cookies.set(GOOGLE_OAUTH_RETURN_COOKIE, "", options);
    response.cookies.set(GOOGLE_OAUTH_MODE_COOKIE, "", options);
  }
}

function redirectWithClearedCookies(request: Request, state: string) {
  const response = NextResponse.redirect(accountUrl(request, state));
  clearOauthCookies(response);
  return response;
}

export async function GET(request: Request) {
  const dbStatus = await getAccountDatabaseStatus();
  if (!dbStatus.ready) {
    return redirectWithClearedCookies(request, "accounts-unavailable");
  }
  if (!isGoogleOAuthConfigured()) {
    return redirectWithClearedCookies(request, "google-unavailable");
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get("error")) {
    return redirectWithClearedCookies(request, "google-denied");
  }

  const code = requestUrl.searchParams.get("code") || "";
  const state = requestUrl.searchParams.get("state") || "";
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value || "";
  const verifier = cookieStore.get(GOOGLE_OAUTH_VERIFIER_COOKIE)?.value || "";
  const returnTo = safeAccountReturnTo(cookieStore.get(GOOGLE_OAUTH_RETURN_COOKIE)?.value || "");
  const mode = cookieStore.get(GOOGLE_OAUTH_MODE_COOKIE)?.value === "signup" ? "signup" : "signin";
  if (!code || !state || !expectedState || !verifier || state !== expectedState) {
    return redirectWithClearedCookies(request, "google-failed");
  }

  try {
    const token = await exchangeGoogleAuthorizationCode({ code, codeVerifier: verifier });
    const profile = await fetchGoogleAccountProfile({
      accessToken: token.access_token || "",
      idToken: token.id_token || null,
    });
    const user = await upsertGoogleUserAccount({
      googleSubject: profile.googleSubject,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });
    const sessionToken = await createUserSessionCookieValue(user.id);
    const response = NextResponse.redirect(returnTo ? new URL(returnTo, request.url) : accountUrl(request, mode === "signup" ? "google-created" : "google-signed-in"));
    setUserSessionCookieOnResponse(response, sessionToken);
    clearOauthCookies(response);
    return response;
  } catch {
    return redirectWithClearedCookies(request, "google-failed");
  }
}
