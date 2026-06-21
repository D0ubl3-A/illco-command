import assert from "node:assert/strict";
import test from "node:test";

import { buildReadinessLedger } from "../scripts/write-readiness-ledger";

const baseProduct = {
  planTier: "Studio",
  funnelPlanId: "studio",
  licenseMode: "seat",
  routeAfterPurchase: {
    type: "command-center",
    href: "/",
  },
  needsDemoVideo: false,
  publicInFunnel: true,
};

test("readiness ledger classifies working, locked, and manual-review products", () => {
  const ledger = buildReadinessLedger(
    {
      generatedAt: "2026-05-25T00:00:00.000Z",
      sources: {
        deploymentSnapshotTakenAt: "2026-05-25T00:00:00.000Z",
        healthSnapshotGeneratedAt: "2026-05-25T00:00:00.000Z",
        demoVideoSnapshotGeneratedAt: "2026-05-25T00:00:00.000Z",
      },
      summary: {
        totalProducts: 3,
        publicInFunnel: 2,
        needsDemoVideo: 1,
        healthGateBehavior: {
          "allow-checkout": 1,
          "block-checkout": 1,
          "manual-review": 1,
        },
      },
      products: {
        working: {
          ...baseProduct,
          productId: "working",
          healthGate: { status: "healthy", behavior: "allow-checkout", reason: "ok" },
        },
        locked: {
          ...baseProduct,
          productId: "locked",
          publicInFunnel: false,
          healthGate: { status: "offline", behavior: "block-checkout", reason: "No production URL assigned." },
        },
        review: {
          ...baseProduct,
          productId: "review",
          publicInFunnel: false,
          healthGate: { status: "healthy", behavior: "manual-review", reason: "Reviewed sale only." },
        },
      },
    },
    {
      generatedAt: "2026-05-25T00:00:00.000Z",
      summary: { checked: 3, healthy: 2, degraded: 0, offline: 1 },
      projects: {
        locked: { status: "offline", error: "No production URL assigned." },
      },
    },
    {
      generatedAt: "2026-05-25T00:00:00.000Z",
      projects: {
        working: { youtubeVideoId: "abc123" },
      },
    },
  );

  assert.equal(ledger.summary.totalProducts, 3);
  assert.equal(ledger.summary.working, 1);
  assert.equal(ledger.summary.locked, 1);
  assert.equal(ledger.summary.manualReview, 1);
  assert.equal(ledger.summary.proofReady, 1);
  assert.equal(ledger.rows.find((row) => row.productId === "locked")?.nextAction, "No production URL assigned.");
});

test("readiness ledger treats checkout-warning products as locked and counted", () => {
  const ledger = buildReadinessLedger(
    {
      generatedAt: "2026-05-25T00:00:00.000Z",
      sources: {
        deploymentSnapshotTakenAt: "2026-05-25T00:00:00.000Z",
        healthSnapshotGeneratedAt: "2026-05-25T00:00:00.000Z",
        demoVideoSnapshotGeneratedAt: null,
      },
      summary: {
        totalProducts: 1,
        publicInFunnel: 1,
        needsDemoVideo: 0,
        healthGateBehavior: {
          "allow-checkout-with-warning": 1,
        },
      },
      products: {
        degraded: {
          ...baseProduct,
          productId: "degraded",
          healthGate: { status: "degraded", behavior: "allow-checkout-with-warning", reason: "degraded" },
        },
      },
    },
    {
      generatedAt: "2026-05-25T00:00:00.000Z",
      summary: { checked: 1, healthy: 0, degraded: 1, offline: 0 },
    },
    {
      generatedAt: null,
      projects: {},
    },
  );

  assert.equal(ledger.summary.checkoutWarning, 1);
  assert.equal(ledger.summary.locked, 1);
  assert.equal(ledger.rows[0].state, "locked");
});
