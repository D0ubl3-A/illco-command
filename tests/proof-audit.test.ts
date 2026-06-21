import assert from "node:assert/strict";
import test from "node:test";

import { getProofAuditSnapshot } from "../lib/proof-audit";

test("proof audit reflects mastering as proof-ready once result proof exists", () => {
  const audit = getProofAuditSnapshot();
  const mastering = audit.rows.find((row) => row.productId === "mastering-studio-platform");

  assert.ok(mastering);
  assert.equal(mastering.needsResultProof, true);
  assert.equal(mastering.hasResultProof, true);
  assert.equal(mastering.proofReady, true);
  assert.equal(mastering.proofLabel, "Result proof ready");
});
