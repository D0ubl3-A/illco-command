import assert from "node:assert/strict";
import test from "node:test";

import { getCodexSdkEntitlement } from "@/lib/codex-entitlements";

test("Codex SDK access is locked without a completed high-tier purchase", () => {
  const entitlement = getCodexSdkEntitlement([
    { planId: "studio", productId: "illco-command", status: "complete" },
    { planId: "agency", productId: "illco-command", status: "created" },
  ]);

  assert.equal(entitlement.allowed, false);
  assert.equal(entitlement.requiredPlan, "agency");
  assert.equal(entitlement.bestPlan, "studio");
});

test("Codex SDK access is allowed for completed Agency and Enterprise purchases", () => {
  const agency = getCodexSdkEntitlement([
    { planId: "agency", productId: "illco-command", status: "complete" },
  ]);
  const enterprise = getCodexSdkEntitlement([
    { planId: "enterprise", productId: "illco-command", status: "active" },
  ]);

  assert.equal(agency.allowed, true);
  assert.equal(agency.bestPlan, "agency");
  assert.equal(enterprise.allowed, true);
  assert.equal(enterprise.bestPlan, "enterprise");
});
