import type { Metadata } from "next";
import Link from "next/link";

import { BrainClient } from "@/app/brain/brain-client";
import styles from "@/app/brain/brain.module.css";
import { isTrustedAdminEmail } from "@/lib/admin-identities";
import { createFallbackBrainSnapshot } from "@/lib/brain-seed";
import { getBrainSnapshot } from "@/lib/brain-store";
import { getAccountDatabaseStatus, getCurrentUser } from "@/lib/user-accounts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ILLCO Brain OS",
  description: "Private operating memory for iLLCo Ai, M3ntally-iLL, products, projects, research, content, and decisions.",
};

function LockedBrain({ reason }: { reason: string }) {
  return (
    <main id="main-content" className={styles.lockedPage}>
      <section className={styles.lockedCard}>
        <span className={styles.eyebrow}>PRIVATE WORKSPACE</span>
        <h1>ILLCO Brain OS</h1>
        <p>{reason}</p>
        <div className={styles.lockedActions}>
          <Link className={styles.primaryButton} href="/account?returnTo=/brain">Sign in to Brain OS</Link>
          <Link className={styles.secondaryButton} href="/">Return to ILLCO</Link>
        </div>
      </section>
    </main>
  );
}

export default async function BrainPage() {
  const accountStatus = await getAccountDatabaseStatus();
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;

  if (accountStatus.ready) {
    try {
      currentUser = await getCurrentUser();
    } catch {
      currentUser = null;
    }
  }

  if (!currentUser) {
    return <LockedBrain reason="Sign in with an authorized ILLCO admin account. The public site never exposes your private memory graph." />;
  }

  if (!isTrustedAdminEmail(currentUser.email)) {
    return <LockedBrain reason="This account is signed in, but Brain OS is restricted to the ILLCO owner/admin identity." />;
  }

  let storageMode: "database" | "read-only" = "read-only";
  let storageMessage = accountStatus.reason || "Database storage is not available, so the safe bootstrap snapshot is shown read-only.";
  let snapshot = createFallbackBrainSnapshot(currentUser.email);

  if (accountStatus.ready) {
    try {
      snapshot = await getBrainSnapshot(currentUser.email);
      storageMode = "database";
      storageMessage = "Persistent private storage is active for this admin account.";
    } catch (error) {
      storageMessage = error instanceof Error ? error.message : storageMessage;
    }
  }

  return (
    <main id="main-content" className={styles.page}>
      <BrainClient
        ownerName={currentUser.name || "Aaron"}
        storageMode={storageMode}
        storageMessage={storageMessage}
        snapshot={snapshot}
      />
    </main>
  );
}
