import assert from "node:assert/strict";
import test from "node:test";

process.env.LICENSE_SIGNING_SECRET = "license-test-secret";
delete process.env.MASTER_LICENSE_KEY;
delete process.env.LICENSE_KEYS;

test("signed licenses are bound to the requested product", async () => {
  const { issueSignedLicense, validateLicenseKey } = await import("../lib/license");
  const licenseKey = issueSignedLicense({
    email: "editor@example.com",
    productId: "viral-stitch-ai",
  });

  const valid = validateLicenseKey(licenseKey, { productId: "viral-stitch-ai" });
  assert.equal(valid.ok, true);
  assert.equal(valid.source, "signed");
  assert.equal(valid.productId, "viral-stitch-ai");
  assert.equal(valid.email, "editor@example.com");

  const wrongProduct = validateLicenseKey(licenseKey, { productId: "youtube-ops-vercel" });
  assert.equal(wrongProduct.ok, false);
  assert.equal(wrongProduct.source, "signed");
});
