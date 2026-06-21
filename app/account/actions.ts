"use server";

import { redirect } from "next/navigation";

import { safeAccountReturnTo } from "@/lib/account-return";
import { clearUserSessionCookie, setUserSessionCookie } from "@/lib/user-session-cookie";
import {
  consumeUserActionToken,
  createUserAccount,
  createUserActionToken,
  authenticateUserAccount,
  findUserByEmail,
  getAccountDatabaseStatus,
  markUserEmailVerified,
  revokeCurrentUserSession,
  setUserPassword,
} from "@/lib/user-accounts";
import { validateAccountPassword } from "@/lib/user-password";

function readFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function redirectWithState(state: string): never {
  redirect(`/account?auth=${encodeURIComponent(state)}`);
}

function redirectAfterAuth(formData: FormData, state: string) {
  const returnTo = safeAccountReturnTo(readFormValue(formData.get("returnTo")));
  if (returnTo) {
    redirect(returnTo as never);
  }
  redirectWithState(state);
}

export async function registerUserAccount(formData: FormData) {
  const dbStatus = await getAccountDatabaseStatus();
  if (!dbStatus.ready) {
    redirectWithState("accounts-unavailable");
  }

  if (readFormValue(formData.get("website"))) {
    redirectAfterAuth(formData, "created");
  }

  const password = readFormValue(formData.get("password"));
  const passwordValidation = validateAccountPassword(password);

  if (!passwordValidation.valid) {
    redirectWithState("weak-password");
  }

  try {
    const user = await createUserAccount({
      name: readFormValue(formData.get("name")),
      email: readFormValue(formData.get("email")),
      company: readFormValue(formData.get("company")),
      password,
    });

    await setUserSessionCookie(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/already exists/i.test(message)) {
      redirectWithState("account-exists");
    }
    redirectWithState("create-failed");
  }

  redirectAfterAuth(formData, "created");
}

export async function signInUserAccount(formData: FormData) {
  const dbStatus = await getAccountDatabaseStatus();
  if (!dbStatus.ready) {
    redirectWithState("accounts-unavailable");
  }

  let user: Awaited<ReturnType<typeof authenticateUserAccount>> = null;
  try {
    user = await authenticateUserAccount(
      readFormValue(formData.get("email")),
      readFormValue(formData.get("password")),
    );
  } catch {
    redirectWithState("accounts-unavailable");
  }

  if (!user) {
    return redirectWithState("invalid");
  }

  try {
    await setUserSessionCookie(user.id);
  } catch {
    redirectWithState("accounts-unavailable");
  }
  redirectAfterAuth(formData, "signed-in");
}

export async function signOutUserAccount() {
  await revokeCurrentUserSession();
  await clearUserSessionCookie();

  redirectWithState("signed-out");
}

export async function requestPasswordReset(formData: FormData) {
  const dbStatus = await getAccountDatabaseStatus();
  if (!dbStatus.ready) {
    redirectWithState("accounts-unavailable");
  }

  const email = readFormValue(formData.get("email"));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) {
    redirectWithState("reset-invalid-email");
  }

  try {
    const user = await findUserByEmail(email);
    if (user?.id) {
      await createUserActionToken({
        userId: user.id,
        tokenType: "reset_password",
        ttlSeconds: 60 * 60 * 2,
        createdBy: "self-service-request",
        metadata: { via: "account-request-reset" },
      });
    }
  } catch {
    redirectWithState("reset-request-failed");
  }

  redirectWithState("reset-requested");
}

export async function completePasswordReset(formData: FormData) {
  const dbStatus = await getAccountDatabaseStatus();
  if (!dbStatus.ready) {
    redirectWithState("accounts-unavailable");
  }

  const token = readFormValue(formData.get("token"));
  const password = readFormValue(formData.get("password"));
  const passwordValidation = validateAccountPassword(password);
  if (!passwordValidation.valid) {
    redirectWithState("weak-password");
  }

  let user: Awaited<ReturnType<typeof consumeUserActionToken>> = null;
  try {
    user = await consumeUserActionToken({ token, tokenType: "reset_password" });
  } catch {
    redirectWithState("reset-token-invalid");
  }
  if (!user?.id) {
    redirectWithState("reset-token-invalid");
  }

  try {
    await setUserPassword(user.id, password);
    await setUserSessionCookie(user.id);
  } catch {
    redirectWithState("reset-request-failed");
  }

  redirectWithState("reset-complete");
}

export async function verifyEmailToken(formData: FormData) {
  const dbStatus = await getAccountDatabaseStatus();
  if (!dbStatus.ready) {
    redirectWithState("accounts-unavailable");
  }

  const token = readFormValue(formData.get("token"));
  let user: Awaited<ReturnType<typeof consumeUserActionToken>> = null;
  try {
    user = await consumeUserActionToken({ token, tokenType: "verify_email" });
  } catch {
    redirectWithState("verify-token-invalid");
  }
  if (!user?.id) {
    redirectWithState("verify-token-invalid");
  }

  try {
    await markUserEmailVerified(user.id);
    await setUserSessionCookie(user.id);
  } catch {
    redirectWithState("verify-failed");
  }

  redirectWithState("verify-complete");
}
