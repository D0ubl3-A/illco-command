import assert from "node:assert/strict";
import test from "node:test";

import { hashAccountPassword, validateAccountPassword, verifyAccountPassword } from "../lib/user-password";

test("account passwords require useful minimum strength", () => {
  assert.equal(validateAccountPassword("short1").valid, false);
  assert.equal(validateAccountPassword("longpassword").valid, false);
  assert.equal(validateAccountPassword("longpassword1").valid, true);
});

test("account password hashes verify only the original password", async () => {
  const hash = await hashAccountPassword("correct-password-1");

  assert.equal(await verifyAccountPassword("correct-password-1", hash), true);
  assert.equal(await verifyAccountPassword("wrong-password-1", hash), false);
});
