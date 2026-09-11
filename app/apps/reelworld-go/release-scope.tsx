"use client";

export function ReelWorldReleaseScope() {
  return (
    <div
      role="status"
      aria-label="ReelWorld release scope"
      style={{
        position: "fixed",
        zIndex: 20070,
        left: 10,
        right: 10,
        bottom: "calc(72px + env(safe-area-inset-bottom))",
        margin: "0 auto",
        width: "min(560px, calc(100% - 20px))",
        border: "1px solid #31586a",
        borderRadius: 12,
        background: "#04141bea",
        color: "#d9f6ff",
        padding: "7px 10px",
        fontSize: 9,
        lineHeight: 1.35,
        textAlign: "center",
        boxShadow: "0 8px 24px #0008",
        backdropFilter: "blur(10px)",
        pointerEvents: "none",
      }}
    >
      DEVICE SAVE · CASUAL VS BETA · REAL-MONEY TOURNAMENTS, CASH-OUT & PAID PAYOUTS DISABLED
    </div>
  );
}
