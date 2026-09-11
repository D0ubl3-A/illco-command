"use client";

import { useEffect } from "react";

const LOCK_SCORE = 46;

export function WaterScanCastGate() {
  useEffect(() => {
    const applyGate = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const cast = buttons.find(button => (button.textContent || "").trim() === "CAST LINE");
      if (!cast) return;

      const scanNode = Array.from(document.querySelectorAll<HTMLElement>("div")).find(node =>
        (node.textContent || "").trim().startsWith("WATER SCAN"),
      );
      const score = Number((scanNode?.textContent || "").match(/(\d{1,3})%/)?.[1] || 0);
      const cameraOn = buttons.some(button => (button.textContent || "").includes("CAMERA ON"));
      const verified = cameraOn && score >= LOCK_SCORE;

      cast.disabled = !verified;
      cast.setAttribute("aria-disabled", String(!verified));
      cast.title = verified
        ? "Water Scan verified — ready to cast"
        : `Start the AR camera and hold on visible water until Water Scan reaches ${LOCK_SCORE}%+`;
    };

    applyGate();
    const timer = window.setInterval(applyGate, 250);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
