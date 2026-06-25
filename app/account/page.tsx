import type { Metadata } from "next";

import {
  completePasswordReset,
  registerUserAccount,
  requestPasswordReset,
  signInUserAccount,
  signOutUserAccount,
  verifyEmailToken,
} from "./actions";
import { safeAccountReturnTo } from "@/lib/account-return";
import { isTrustedAdminEmail } from "@/lib/admin-identities";
import { hydrateCheckoutSuccess } from "@/lib/checkout-success";
import { isCommandPaymentUnlockProduct } from "@/lib/command-payment-products";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth";
import {
  attachCheckoutSessionToUser,
  getAccountDatabaseStatus,
  getCurrentUser,
  listUserPurchases,
  type UserPurchase,
} from "@/lib/user-accounts";
import { resolvePurchaseLaunchAccess } from "@/lib/launch-access";

export const metadata: Metadata = {
  title: "Account",
  description: "Purchase confirmation, launch links, access details, and billing help for ILLCO Command purchases.",
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function normalizeEmail(value: string | null | undefined) {
  const raw = String(value || "").trim().toLowerCase();
  return raw || null;
}

function googleStartHref(returnTo: string, mode: "signin" | "signup" = "signin") {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  if (mode === "signup") params.set("mode", "signup");
  const query = params.toString();
  return `/api/account/google/start${query ? `?${query}` : ""}`;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const checkoutState = readSearchValue(resolvedSearchParams.checkout);
  const sessionId = readSearchValue(resolvedSearchParams.session_id);
  const portalState = readSearchValue(resolvedSearchParams.portal);
  const authState = readSearchValue(resolvedSearchParams.auth);
  const verifyToken = readSearchValue(resolvedSearchParams.verifyToken);
  const resetToken = readSearchValue(resolvedSearchParams.resetToken);
  const returnTo = safeAccountReturnTo(readSearchValue(resolvedSearchParams.returnTo));
  const accountDbStatus = await getAccountDatabaseStatus();
  const accountsConfigured = accountDbStatus.configured;
  let accountAvailabilityMessage = accountDbStatus.ready ? "" : accountDbStatus.reason || "Account services are unavailable.";
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;

  if (accountDbStatus.ready) {
    try {
      currentUser = await getCurrentUser();
    } catch {
      accountAvailabilityMessage = "User accounts are temporarily unavailable. The public funnel is still online.";
    }
  }

  let success:
    | Awaited<ReturnType<typeof hydrateCheckoutSuccess>>
    | null = null;
  let errorDetail = "";

  if (sessionId) {
    try {
      success = await hydrateCheckoutSuccess({
        sessionId,
        viewerEmail: currentUser?.email || null,
      });
    } catch {
      errorDetail = "We could not load the purchase confirmation yet. Please retry from your purchase link or contact support.";
    }
  }

  const normalizedCurrentUserEmail = normalizeEmail(currentUser?.email || null);
  const currentUserIsAdmin = isTrustedAdminEmail(normalizedCurrentUserEmail);
  const normalizedCheckoutEmail = normalizeEmail(success?.email || null);
  const checkoutEmailMatchesCurrentUser =
    Boolean(
      currentUser &&
      normalizedCurrentUserEmail &&
      normalizedCheckoutEmail &&
      normalizedCurrentUserEmail === normalizedCheckoutEmail,
    );

  if (currentUser && success?.checkoutComplete && checkoutEmailMatchesCurrentUser) {
    try {
      await attachCheckoutSessionToUser(success.sessionId, currentUser.id, success.email || currentUser.email);
    } catch {
      accountAvailabilityMessage = "Your purchase is verified, but saved account access could not update yet.";
    }
  } else if (currentUser && success?.checkoutComplete && normalizedCheckoutEmail && normalizedCurrentUserEmail && normalizedCheckoutEmail !== normalizedCurrentUserEmail) {
    accountAvailabilityMessage = "Signed in account email does not match this purchase. Use the purchaser email to unlock billing and launch actions.";
  }

  let purchases: UserPurchase[] = [];
  if (currentUser) {
    try {
      purchases = await listUserPurchases(currentUser);
    } catch {
      accountAvailabilityMessage = "Signed in, but saved purchases could not load yet.";
    }
  }
  const purchaseAttachedToCurrentUser =
    Boolean(currentUser && success?.sessionId && purchases.some((purchase) => purchase.sessionId === success.sessionId));
  const checkoutOwnedByCurrentUser =
    Boolean(
      success?.checkoutComplete &&
      currentUser &&
      (checkoutEmailMatchesCurrentUser || (!normalizedCheckoutEmail && purchaseAttachedToCurrentUser)),
    );
  const canUseSensitiveCheckoutActions = Boolean(checkoutOwnedByCurrentUser && success?.checkoutComplete);
  const canUseLicenseAndLaunchActions = Boolean((checkoutOwnedByCurrentUser || currentUserIsAdmin) && success?.checkoutComplete);
  const commandPaymentUnlock = isCommandPaymentUnlockProduct(success?.productId);
  const successLaunchAccess =
    success?.productId && success?.launchHref
      ? resolvePurchaseLaunchAccess(success.productId, success.launchHref, { adminOverride: currentUserIsAdmin })
      : null;
  const canOpenSuccessProduct = Boolean(canUseLicenseAndLaunchActions && successLaunchAccess?.launchEnabled);
  const purchaseOwnershipMessage =
    success?.checkoutComplete && !canUseLicenseAndLaunchActions
      ? currentUser
        ? normalizedCheckoutEmail
          ? `This purchase is tied to ${normalizedCheckoutEmail}. Sign in with that email to unlock launch and billing actions.`
          : "Purchase verified, but purchaser identity could not be confirmed yet. Sign in with the receipt email to continue."
        : normalizedCheckoutEmail
          ? `Sign in with ${normalizedCheckoutEmail} to unlock launch and billing actions for this purchase.`
          : "Sign in with the purchaser email from your receipt to unlock launch and billing actions."
      : "";
  const firstName = currentUser?.name.split(" ")[0] || "";
  const authMessage = authState ? authStateMessage(authState) : "";
  const accountFormsEnabled = accountsConfigured && !accountAvailabilityMessage;
  const googleOAuthReady = isGoogleOAuthConfigured();
  const googleSignInHref = googleOAuthReady ? googleStartHref(returnTo, "signin") : "/account?auth=google-unavailable";
  const googleSignUpHref = googleOAuthReady ? googleStartHref(returnTo, "signup") : "/account?auth=google-unavailable";

  const title = currentUser
    ? `Welcome back, ${firstName || "there"}`
    : success?.checkoutComplete
    ? `${success.productName} is unlocked`
    : checkoutState === "cancelled"
      ? "Purchase not completed"
      : "Create your ILLCO account";
  const subtitle = currentUser
    ? "Your account keeps app access, purchase history, billing help, and future agent work in one secure place."
    : success?.checkoutComplete
    ? "Your purchase is verified. Launch your app, review access details, or get billing help from this page."
    : checkoutState === "cancelled"
      ? "No charge was completed. You can return to the plans when you are ready."
      : "Sign in or create an account to save purchases, launch apps, and manage access.";

  return (
    <div className="fallbackPage">
      <div className="workspace accountWorkspace">
        <section className="panel accountHeroPanel">
          <div className="accountHeroCopy">
            <span className={`readinessPill ${success?.checkoutComplete ? "ready" : checkoutState === "cancelled" ? "pending" : "neutral"}`}>
              {currentUser ? "Signed in" : success?.checkoutComplete ? "Subscription verified" : checkoutState === "cancelled" ? "Purchase not completed" : "Account center"}
            </span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="accountHeroActions">
              {canOpenSuccessProduct && successLaunchAccess ? (
                <a className="button primary" href={successLaunchAccess.launchHref} target={successLaunchAccess.launchHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                Open {success?.productName || "ILLCO Command"}
                </a>
              ) : (
              <a className="button primary" href="/">
                Back to ILLCO Command
              </a>
            )}
            <a className="button secondary" href="/">
              Browse services
            </a>
            {returnTo ? (
              <a className="button secondary" href={returnTo}>
                Return to app
              </a>
            ) : null}
            {currentUserIsAdmin ? (
              <a className="button secondary" href="/admin?panel=watcher#watcher">
                Open watcher
              </a>
            ) : null}
            {currentUser ? (
              <form action={signOutUserAccount}>
                <button className="button secondary" type="submit">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </section>

        {accountAvailabilityMessage ? <div className="resultBox">{accountAvailabilityMessage}</div> : null}
        {authMessage ? <div className="resultBox">{authMessage}</div> : null}
        {purchaseOwnershipMessage ? <div className="resultBox">{purchaseOwnershipMessage}</div> : null}

        {currentUser ? (
          <section className="accountGrid">
            <article className="panel accountCard">
              <div className="panelHeader">
                <div>
                  <h2>Your profile</h2>
                  <p>Use this identity for purchases, app handoff, and future agent systems.</p>
                </div>
              </div>
              <div className="accountFacts">
                <Fact label="Name" value={currentUser.name} tone="neutral" />
                <Fact label="Email" value={currentUser.email} tone="good" />
                <Fact label="Email verified" value={currentUser.emailVerifiedAt ? "Yes" : "No"} tone={currentUser.emailVerifiedAt ? "good" : "warn"} />
                <Fact label="Google linked" value={currentUser.googleLinked ? "Yes" : "No"} tone={currentUser.googleLinked ? "good" : "neutral"} />
                <Fact label="Admin access" value={currentUserIsAdmin ? "Global unlock" : "Standard"} tone={currentUserIsAdmin ? "good" : "neutral"} />
                <Fact label="Company" value={currentUser.company || "Not set"} tone="neutral" />
                <Fact label="Purchases" value={String(purchases.length)} tone={purchases.length ? "good" : "neutral"} />
              </div>
            </article>

            <article className="panel accountCard">
              <div className="panelHeader">
                <div>
                  <h2>Saved access</h2>
                  <p>Purchases tied to this email are attached to your account automatically.</p>
                </div>
              </div>
              <PurchaseList purchases={purchases} />
            </article>
          </section>
        ) : (
          <section className="accountGrid">
            <article className="panel accountCard">
              <div className="panelHeader">
                <div>
                  <h2>Sign in</h2>
                  <p>Return to saved purchases, billing help, and app access.</p>
                </div>
              </div>
              <a className={`button secondary googleButton${googleOAuthReady ? "" : " isDisabled"}`} href={googleSignInHref} aria-disabled={!googleOAuthReady}>
                Sign in with Google
              </a>
              <form action={signInUserAccount} className="formStack">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" required disabled={!accountFormsEnabled} />
                </label>
                <label>
                  Password
                  <input name="password" type="password" autoComplete="current-password" required disabled={!accountFormsEnabled} />
                </label>
                <button className="button primary" type="submit" disabled={!accountFormsEnabled}>
                  Sign in
                </button>
              </form>
            </article>

            <article className="panel accountCard">
              <div className="panelHeader">
                <div>
                  <h2>Create account</h2>
                  <p>Save purchase history, app links, and future AI system handoffs.</p>
                </div>
              </div>
              <a className={`button secondary googleButton${googleOAuthReady ? "" : " isDisabled"}`} href={googleSignUpHref} aria-disabled={!googleOAuthReady}>
                Sign up with Gmail
              </a>
              <form action={registerUserAccount} className="formStack">
                <input className="honeyField" name="website" tabIndex={-1} autoComplete="off" />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label>
                  Name
                  <input name="name" autoComplete="name" required disabled={!accountFormsEnabled} />
                </label>
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" required disabled={!accountFormsEnabled} />
                </label>
                <label>
                  Company
                  <input name="company" autoComplete="organization" disabled={!accountFormsEnabled} />
                </label>
                <label>
                  Password
                  <input name="password" type="password" autoComplete="new-password" minLength={10} required disabled={!accountFormsEnabled} />
                </label>
                <button className="button primary" type="submit" disabled={!accountFormsEnabled}>
                  Create account
                </button>
                <div className="accountNote">
                  <strong>Password rule</strong>
                  <span>Use at least 10 characters with letters and a number.</span>
                </div>
              </form>
            </article>

            <article className="panel accountCard">
              <div className="panelHeader">
                <div>
                  <h2>Password reset</h2>
                  <p>Request a reset or apply your secure reset token.</p>
                </div>
              </div>

              {resetToken ? (
                <form action={completePasswordReset} className="formStack">
                  <input type="hidden" name="token" value={resetToken} />
                  <label>
                    New password
                    <input name="password" type="password" autoComplete="new-password" minLength={10} required disabled={!accountFormsEnabled} />
                  </label>
                  <button className="button primary" type="submit" disabled={!accountFormsEnabled}>
                    Set new password
                  </button>
                </form>
              ) : (
                <form action={requestPasswordReset} className="formStack">
                  <label>
                    Email
                    <input name="email" type="email" autoComplete="email" required disabled={!accountFormsEnabled} />
                  </label>
                  <button className="button secondary" type="submit" disabled={!accountFormsEnabled}>
                    Request reset token
                  </button>
                </form>
              )}

              {verifyToken ? (
                <form action={verifyEmailToken} className="formStack compactForm">
                  <input type="hidden" name="token" value={verifyToken} />
                  <button className="button secondary" type="submit" disabled={!accountFormsEnabled}>
                    Verify email token
                  </button>
                </form>
              ) : null}
            </article>
          </section>
        )}

        <section className="accountGrid">
          <article className="panel accountCard">
            <div className="panelHeader">
              <div>
                <h2>Purchase state</h2>
                <p>Checked securely when a purchase confirmation is available.</p>
              </div>
            </div>
            <div className="accountFacts">
              <Fact label="Purchase" value={success?.checkoutComplete ? "verified" : checkoutState === "cancelled" ? "not completed" : "pending"} tone={success?.checkoutComplete ? "good" : checkoutState === "cancelled" ? "warn" : "neutral"} />
              <Fact label="Payment" value={success?.paymentStatus || "awaiting"} tone={success?.checkoutComplete ? "good" : "neutral"} />
              <Fact label="Product" value={success?.productName || "ILLCO Command"} tone="neutral" />
              <Fact label="Confirmation" value={success?.sessionId || sessionId ? "available" : "not available"} tone={success?.sessionId || sessionId ? "good" : "neutral"} />
            </div>
            {portalState === "return" ? (
              <div className="resultBox">Returned from billing settings.</div>
            ) : null}
            {errorDetail ? <div className="resultBox">{errorDetail}</div> : null}
          </article>

          <article className="panel accountCard">
            <div className="panelHeader">
              <div>
                <h2>Launch and billing</h2>
                <p>Open the purchased app and manage your subscription from the same place.</p>
              </div>
            </div>
            <div className="accountActionStack">
              {canUseSensitiveCheckoutActions && success?.portalGrant ? (
                <form action="/api/subscriptions/portal/customer" method="post" className="formStack">
                  <input type="hidden" name="sessionId" value={success?.sessionId || ""} />
                  <input type="hidden" name="grant" value={success?.portalGrant || ""} />
                  <button className="button secondary" type="submit">
                    Manage billing
                  </button>
                </form>
              ) : (
                <div className="accountNote">
                  <strong>Billing</strong>
                  <span>{success?.checkoutComplete ? "Sign in with the purchaser email to manage billing." : "Available after your purchase is complete."}</span>
                </div>
              )}

              <div className="accountNote">
                <strong>Launch access</strong>
                <span>
                  {canOpenSuccessProduct
                    ? "Ready to open."
                    : canUseLicenseAndLaunchActions
                      ? successLaunchAccess?.launchBlockedReason || "Launch is locked pending verification for this product."
                    : success?.checkoutComplete
                      ? "Sign in with the purchaser email to unlock launch."
                      : "Available after your purchase is complete."}
                </span>
              </div>

              <div className="accountNote">
                <strong>Receipt contact</strong>
                <span>
                  {canUseSensitiveCheckoutActions
                    ? success?.email || "Shown after purchase confirmation."
                    : success?.checkoutComplete
                      ? "Sign in with the purchaser email to view."
                      : "Shown after purchase confirmation."}
                </span>
              </div>
            </div>
          </article>

          <article className="panel accountCard">
            <div className="panelHeader">
              <div>
                <h2>Trial policy</h2>
                <p>Free trial length depends on the plan selected at checkout.</p>
              </div>
            </div>
            <div className="accountFacts">
              <Fact label="Core" value="3 days" tone="neutral" />
              <Fact label="Studio" value="5 days" tone="neutral" />
              <Fact label="Suite" value="3 days" tone="neutral" />
              <Fact label="Agency" value="1 day" tone="neutral" />
              <Fact label="Enterprise" value="1 day" tone="neutral" />
            </div>
          </article>
        </section>

        <section className="accountGrid">
          <article className="panel accountCard">
            <div className="panelHeader">
              <div>
                <h2>Access details</h2>
                <p>Your access details appear here after the purchase is verified.</p>
              </div>
            </div>
            {commandPaymentUnlock && success?.checkoutComplete ? (
              <div className="accountNote">
                <strong>Command unlock</strong>
                <span>
                  {canUseLicenseAndLaunchActions
                    ? "This product unlocks through your ILLCO Command account and checkout record. No license key is required."
                    : "Sign in with the purchaser email to attach this Command unlock to your account."}
                </span>
              </div>
            ) : canUseLicenseAndLaunchActions && success?.licenseKey ? (
              <div className="licensePanel">
                <strong>{success?.productName || "ILLCO Command"} access key</strong>
                <textarea className="licenseBox" value={success?.licenseKey || ""} readOnly />
              </div>
            ) : (
              <div className="accountNote">
                <strong>Access pending</strong>
                <span>
                  {success?.checkoutComplete
                    ? "Your access details are being prepared for this purchase."
                    : "Complete your purchase to receive access details."}
                </span>
              </div>
            )}
          </article>

          <article className="panel accountCard">
            <div className="panelHeader">
              <div>
                <h2>Purchase readiness</h2>
                <p>These steps show what is available for this account experience.</p>
              </div>
            </div>
            <div className="accountChecklist">
              <ChecklistItem label="Secure return links" ready />
              <ChecklistItem label="Public plan selection" ready />
              <ChecklistItem label="Purchase confirmation" ready={Boolean(success?.checkoutComplete)} />
              <ChecklistItem label="Billing help" ready={Boolean(canUseSensitiveCheckoutActions && success?.portalGrant)} />
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "neutral" }) {
  return (
    <div className={`factCard ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ChecklistItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="configItem">
      <span className={ready ? "statusDot ready" : "statusDot"} />
      <strong>{label}</strong>
      <small>{ready ? "Ready" : "Pending"}</small>
    </div>
  );
}

function PurchaseList({ purchases }: { purchases: UserPurchase[] }) {
  if (purchases.length === 0) {
    return (
      <div className="accountNote">
        <strong>No saved purchases yet</strong>
        <span>Purchases made with this email will appear here after checkout confirmation.</span>
      </div>
    );
  }

  return (
    <div className="purchaseList">
      {purchases.map((purchase) => (
        <article className="purchaseRow" key={purchase.sessionId}>
          <div>
            <strong>{purchase.productName}</strong>
            <span>{purchase.planId} / {purchase.status}{purchase.launchEnabled ? "" : " / manual-review"}</span>
          </div>
          {purchase.launchEnabled ? (
            <a className="button secondary" href={purchase.launchHref} target={purchase.launchHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              Open
            </a>
          ) : (
            <span className="button secondary" aria-disabled="true" title={purchase.launchBlockedReason || "Launch is locked pending verification."}>
              Locked
            </span>
          )}
        </article>
      ))}
    </div>
  );
}

function authStateMessage(state: string) {
  const messages: Record<string, string> = {
    "accounts-unavailable": "User accounts need the account database to be available before sign-in can work.",
    "account-exists": "An account already exists for that email. Sign in instead.",
    "create-failed": "Account creation could not be completed. Please check the details and try again.",
    "created": "Account created. You are signed in.",
    "google-denied": "Google sign-in was cancelled.",
    "google-failed": "Google sign-in could not be completed. Check the OAuth redirect URI and try again.",
    "google-created": "Signed up with Gmail.",
    "google-signed-in": "Signed in with Google.",
    "google-unavailable": "Google sign-in is not configured for this deployment yet.",
    "invalid": "Email or password was not accepted.",
    "signed-in": "Signed in.",
    "signed-out": "Signed out.",
    "weak-password": "Use at least 10 characters with letters and a number.",
    "reset-invalid-email": "Enter a valid email address to request a reset token.",
    "reset-requested": "If that email exists, a reset token request has been created.",
    "reset-request-failed": "Password reset could not be processed right now.",
    "reset-token-invalid": "Reset token is invalid or expired.",
    "reset-complete": "Password reset complete. You are signed in.",
    "verify-token-invalid": "Email verification token is invalid or expired.",
    "verify-complete": "Email verified. You are signed in.",
    "verify-failed": "Email verification could not be completed.",
    "verify-ready": "Verification token detected. Submit to verify this account email.",
    "reset-ready": "Reset token detected. Set a new password to continue.",
  };

  return messages[state] || "";
}
