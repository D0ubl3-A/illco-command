import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../app/api/leads/route";

function leadRequest(body: Record<string, unknown>) {
  return new Request("https://illcoai.tech/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("lead capture accepts valid launch-list requests in fallback mode", async () => {
  const response = await POST(
    leadRequest({
      name: "Aaron Michael Allton",
      email: "d0ubl3a0@gmail.com",
      planId: "monday-access-list",
      message: "Join Monday launch list",
    }),
  );
  const payload = await response.json() as { ok?: boolean; fallbackCapture?: boolean; adminEmails?: string[] };

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.fallbackCapture, true);
  assert.ok(payload.adminEmails?.includes("admin@illcoai.tech"));
});

test("lead capture still rejects invalid email", async () => {
  const response = await POST(
    leadRequest({
      name: "Aaron",
      email: "not an email",
    }),
  );

  assert.equal(response.status, 400);
});
