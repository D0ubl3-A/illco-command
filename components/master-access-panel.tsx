"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type MasterAccessStatus = {
  ok?: boolean;
  available?: boolean;
  unlocked?: boolean;
  expiresAt?: number | null;
  unlockedCount?: number;
  unlockableProducts?: Array<{
    id: string;
    displayName: string;
    category: string;
    href: string;
    proofLabel: string;
  }>;
  message?: string;
};

type Props = {
  compact?: boolean;
  onStatusChange?: (status: MasterAccessStatus) => void;
};

const lockedStatus: MasterAccessStatus = {
  available: false,
  unlocked: false,
  unlockedCount: 0,
  unlockableProducts: [],
};

function statusLine(status: MasterAccessStatus | null) {
  if (!status) return "Checking master access...";
  if (!status.available) return "Master access is not configured on this deployment.";
  if (status.unlocked) return `${status.unlockedCount || 0} polished ready tools unlocked.`;
  return "Enter the master key to unlock polished ready tools.";
}

export function MasterAccessPanel({ compact = false, onStatusChange }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<MasterAccessStatus | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [result, setResult] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatus() {
      try {
        const response = await fetch("/api/master-access/session", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => lockedStatus)) as MasterAccessStatus;
        if (!controller.signal.aborted) {
          setStatus(payload);
          setResult(payload.message || "");
          onStatusChange?.(payload);
          window.dispatchEvent(new CustomEvent("illco-master-access-change", { detail: payload }));
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatus(lockedStatus);
          onStatusChange?.(lockedStatus);
        }
      }
    }

    loadStatus();
    return () => controller.abort();
  }, [onStatusChange]);

  function updateStatus(nextStatus: MasterAccessStatus) {
    setStatus(nextStatus);
    setResult(nextStatus.message || "");
    onStatusChange?.(nextStatus);
    window.dispatchEvent(new CustomEvent("illco-master-access-change", { detail: nextStatus }));
    router.refresh();
  }

  function submitMasterKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const licenseKey = keyValue.trim();
    if (!licenseKey || isPending) return;

    startTransition(async () => {
      const response = await fetch("/api/master-access/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey }),
      });
      const payload = (await response.json().catch(() => lockedStatus)) as MasterAccessStatus;
      updateStatus(payload);
      if (response.ok && payload.unlocked) {
        setKeyValue("");
      }
    });
  }

  function lockMasterAccess() {
    startTransition(async () => {
      const response = await fetch("/api/master-access/session", {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => lockedStatus)) as MasterAccessStatus;
      updateStatus(payload);
    });
  }

  const readyTools = status?.unlockableProducts || [];

  return (
    <section className={compact ? "masterAccessPanel masterAccessPanelCompact" : "panel masterAccessPanel"} id="master-access">
      <div className="masterAccessHeader">
        <div>
          <span className={`readinessPill ${status?.unlocked ? "ready" : status?.available ? "neutral" : "pending"}`}>
            {status?.unlocked ? "Master unlocked" : "Master key"}
          </span>
          <h2>Master Tool Unlock</h2>
          <p>{statusLine(status)}</p>
        </div>
        {status?.unlocked ? (
          <button className="button secondary" type="button" onClick={lockMasterAccess} disabled={isPending}>
            Lock
          </button>
        ) : null}
      </div>

      {status?.unlocked ? (
        <div className="masterAccessUnlocked">
          {readyTools.slice(0, compact ? 4 : 8).map((product) => (
            <a className="masterAccessTool" href={product.href} key={product.id}>
              <strong>{product.displayName}</strong>
              <small>{product.proofLabel}</small>
            </a>
          ))}
        </div>
      ) : (
        <form className="masterAccessForm" onSubmit={submitMasterKey}>
          <label>
            Master key
            <input
              type="password"
              value={keyValue}
              onChange={(event) => setKeyValue(event.target.value)}
              placeholder="Paste master key"
              autoComplete="off"
              disabled={!status?.available || isPending}
              required
            />
          </label>
          <button className="button primary" type="submit" disabled={!status?.available || isPending || !keyValue.trim()}>
            {isPending ? "Unlocking..." : "Unlock Ready Tools"}
          </button>
        </form>
      )}

      {result ? <output className="resultBox masterAccessResult">{result}</output> : null}
    </section>
  );
}
