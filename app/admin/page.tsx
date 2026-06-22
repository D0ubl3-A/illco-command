import type { Metadata } from "next";

import { isGoogleOAuthConfigured } from "@/lib/google-oauth";
import { authenticateAdmin } from "./actions";
import { getAdminKey, isAdminAuthenticated } from "./auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  description: "Protected ILLCO Command administration.",
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function adminPanelReturnTo(panel: string) {
  return panel === "watcher" ? "/admin?panel=watcher#watcher" : "/admin";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const state = readSearchValue(resolvedSearchParams.state);
  const panel = readSearchValue(resolvedSearchParams.panel);
  const returnTo = adminPanelReturnTo(panel);
  const adminKeyConfigured = Boolean(getAdminKey());
  const googleOAuthConfigured = isGoogleOAuthConfigured();
  const authenticated = await isAdminAuthenticated();

  if (authenticated) {
    const [{ AdminClient }, { products }, { getConfigurationStatus }, { getProofAuditSnapshot }] = await Promise.all([
      import("@/components/admin-client"),
      import("@/lib/deployments"),
      import("@/lib/env"),
      import("@/lib/proof-audit"),
    ]);

    return <AdminClient products={products} config={getConfigurationStatus()} proofAudit={getProofAuditSnapshot()} />;
  }

  return (
    <AdminLoginGate
      adminKeyConfigured={adminKeyConfigured}
      googleOAuthConfigured={googleOAuthConfigured}
      state={state}
      returnTo={returnTo}
    />
  );
}

function AdminLoginGate({
  adminKeyConfigured,
  googleOAuthConfigured,
  state,
  returnTo,
}: {
  adminKeyConfigured: boolean;
  googleOAuthConfigured: boolean;
  state: string;
  returnTo: string;
}) {
  const message = !adminKeyConfigured && !googleOAuthConfigured
    ? "Admin access is unavailable for this deployment."
    : state === "denied"
      ? "That access key was not accepted."
      : state === "unavailable"
        ? "Admin access is unavailable right now."
        : "";

  return (
    <div className="fallbackPage">
      <main id="main-content" className="workspace">
        <section className="panel accountHeroPanel">
          <div className="accountHeroCopy">
            <span className="readinessPill neutral">Protected access</span>
            <h1>Admin sign in</h1>
            <p>Sign in with a trusted admin Google account or enter the access key to continue.</p>
          </div>
        </section>

        <section className="panel accountCard">
          {message ? <div className="resultBox">{message}</div> : null}
          {googleOAuthConfigured ? (
            <a className="button primary googleButton" href={`/api/account/google/start?returnTo=${encodeURIComponent(returnTo)}`}>
              Continue with Google
            </a>
          ) : null}
          {adminKeyConfigured ? (
            <form action={authenticateAdmin} className="formStack">
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="field">
                <span>Access key</span>
                <input type="password" name="adminKey" autoComplete="current-password" required maxLength={512} />
              </label>
              <button className="button primary" type="submit">
                Continue
              </button>
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
}