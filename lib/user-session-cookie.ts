import "@/lib/server-only";

import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";

import { createUserSession, USER_SESSION_COOKIE, USER_SESSION_TTL_SECONDS } from "@/lib/user-accounts";

export function getUserSessionCookieOptions(maxAge = USER_SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function createUserSessionCookieValue(userId: string) {
  const headerStore = await headers();
  return createUserSession(userId, headerStore.get("user-agent"));
}

export function setUserSessionCookieOnResponse(response: NextResponse, token: string) {
  response.cookies.set(USER_SESSION_COOKIE, token, getUserSessionCookieOptions());
}

export async function setUserSessionCookie(userId: string) {
  const token = await createUserSessionCookieValue(userId);
  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, token, getUserSessionCookieOptions());
}

export async function clearUserSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, "", getUserSessionCookieOptions(0));
}