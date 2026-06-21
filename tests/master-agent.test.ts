import assert from "node:assert/strict";
import test from "node:test";

import { runMasterAgent } from "../lib/master-agent";

test("master agent maps sales offer names to gated app landing routes", () => {
  const result = runMasterAgent({
    message: "Instant Lead Rescue Text Back AI for missed leads and Gmail follow up",
    mode: "sell",
    limit: 5,
  });
  const top = result.recommendations[0];

  assert.equal(result.ok, true);
  assert.equal(top.offerId, "instant-lead-rescue-text-back-ai");
  assert.equal(top.productId, "automateflow");
  assert.equal(top.detailsHref, "/apps/automateflow");
  assert.equal(top.requestHref, "/apps/automateflow#request");
  assert.equal(top.openHref, null);
});

test("master agent includes account actions for login and subscription support", () => {
  const result = runMasterAgent({
    message: "Google OAuth login is not working and users need subscriptions",
    mode: "support",
  });

  assert.ok(result.actions.some((action) => action.href === "/account"));
  assert.ok(result.nextSteps.some((step) => /sign in/i.test(step)));
  assert.ok(result.guardrails.some((guardrail) => /external app launch/i.test(guardrail)));
});
