"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionCookie,
  getAdminKey,
  isSensitiveValueMatch,
} from "./auth";

function readFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function authenticateAdmin(formData: FormData) {
  const adminKey = getAdminKey();

  if (!adminKey) {
    redirect("/admin?state=unavailable");
  }

  const submittedKey = readFormValue(formData.get("adminKey"));

  if (!isSensitiveValueMatch(submittedKey, adminKey)) {
    redirect("/admin?state=denied");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionCookie(adminKey), {
    httpOnly: true,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/admin");
}
