import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "../next.config";

test("www redirects to the apex production domain", async () => {
  const redirects = await nextConfig.redirects?.();
  assert.ok(redirects, "Expected Next.js redirects to be configured.");

  const canonicalRedirect = redirects.find((redirect) =>
    redirect.has?.some((condition) => condition.type === "host" && condition.value === "www.illcoai.tech"),
  );

  assert.ok(canonicalRedirect, "Expected a www host redirect.");
  assert.equal(canonicalRedirect.destination, "https://illcoai.tech/:path*");
  assert.equal(canonicalRedirect.permanent, true);
});
