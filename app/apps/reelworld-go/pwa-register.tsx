"use client";

import { useEffect } from "react";

export function ReelWorldPwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const dedicatedHost = window.location.hostname === "reelworld.illcoai.tech";
    const scope = dedicatedHost ? "/" : "/apps/reelworld-go/";
    navigator.serviceWorker.register("/reelworld-go/sw.js", { scope }).catch(() => {
      // The game remains playable online even if service-worker registration is unavailable.
    });
  }, []);

  return null;
}
