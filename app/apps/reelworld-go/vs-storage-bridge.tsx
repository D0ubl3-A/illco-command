"use client";

import { useEffect } from "react";

const CURRENT_PLAYER_KEY = "illco.reelworld-go.native.v2";
const LEGACY_VS_PLAYER_KEY = "illco.reelworld-go.native.v1";

export function ReelWorldVsStorageBridge() {
  useEffect(() => {
    let last = "";
    const sync = () => {
      try {
        const current = localStorage.getItem(CURRENT_PLAYER_KEY);
        if (!current || current === last) return;
        JSON.parse(current);
        localStorage.setItem(LEGACY_VS_PLAYER_KEY, current);
        last = current;
      } catch {}
    };
    sync();
    const id = window.setInterval(sync, 180);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
