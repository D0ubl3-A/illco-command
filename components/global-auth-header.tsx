"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AccountSession = {
  ok?: boolean;
  authenticated?: boolean;
  accountsConfigured?: boolean;
  temporarilyUnavailable?: boolean;
  accountUrl?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    company: string | null;
    admin?: boolean;
    profileStatus?: string;
  } | null;
};

type MasterAccessStatus = {
  available?: boolean;
  unlocked?: boolean;
  unlockedCount?: number;
};

function userLabel(session: AccountSession | null) {
  const name = session?.user?.name?.trim();
  if (name) return name.split(/\s+/)[0] || name;
  return session?.user?.email || "Account";
}

export function GlobalAuthHeader() {
  const router = useRouter();
  const [session, setSession] = useState<AccountSession | null>(null);
  const [masterAccess, setMasterAccess] = useState<MasterAccessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const [accountResponse, masterResponse] = await Promise.all([
          fetch("/api/account/session", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/master-access/session", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        const payload = (await accountResponse.json().catch(() => null)) as AccountSession | null;
        const masterPayload = (await masterResponse.json().catch(() => null)) as MasterAccessStatus | null;
        if (!controller.signal.aborted) {
          setSession(payload);
          setMasterAccess(masterPayload);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSession(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();
    function handleMasterAccessChange(event: Event) {
      setMasterAccess((event as CustomEvent<MasterAccessStatus>).detail);
    }

    window.addEventListener("illco-master-access-change", handleMasterAccessChange);
    return () => {
      controller.abort();
      window.removeEventListener("illco-master-access-change", handleMasterAccessChange);
    };
  }, []);

  async function handleLogout() {
    startTransition(async () => {
      try {
        await fetch("/api/account/session", {
          method: "POST",
          cache: "no-store",
        });
      } finally {
        setSession((current) => ({
          ...(current || {}),
          authenticated: false,
          user: null,
        }));
        router.refresh();
      }
    });
  }

  const isAuthenticated = Boolean(session?.authenticated && session.user);
  const masterUnlocked = Boolean(masterAccess?.unlocked);
  const accountHref = session?.accountUrl || "/account";
  const accountRole = session?.user?.admin ? "Admin" : "User";

  return (
    <header className="globalAuthHeader" aria-label="Global account navigation">
      <a className="globalAuthBrand" href="/">
        <span>IC</span>
        <strong>ILLCO Command</strong>
      </a>
      <nav className="globalAuthNav" aria-label="Primary links">
        <a href="/tools">ILLCO Tools</a>
        <a href="/commander#apps">Apps</a>
        <a href="/blog">Blog</a>
        <a className={masterUnlocked ? "globalAuthMasterLink isUnlocked" : "globalAuthMasterLink"} href="/account#master-access">
          {masterUnlocked ? `Master Unlocked (${masterAccess?.unlockedCount || 0})` : "Master Key"}
        </a>
        <a className="globalAuthAdminLink" href="/admin">Admin Login</a>
      </nav>
      <div className="globalAuthActions">
        {isAuthenticated ? (
          <>
            <a className="globalAuthUser" href={accountHref} title={session?.user?.email || "Account"}>
              {userLabel(session)} <span aria-label="Account role">{accountRole}</span>
            </a>
            <button className="button secondary globalAuthButton" type="button" onClick={handleLogout} disabled={isPending}>
              {isPending ? "Logging out..." : "Logout"}
            </button>
          </>
        ) : (
          <a className="button primary globalAuthButton" href={accountHref}>
            {isLoading ? "Account" : "User Login"}
          </a>
        )}
      </div>
    </header>
  );
}
