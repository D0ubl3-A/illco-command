import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalFromHtml,
  canonicalMatches,
  containsCurrentLyricVideoPrice,
  isPermanentWwwRedirect,
  audit,
} from "../scripts/verify-live-geo.mjs";

test("reads canonicals regardless of attribute ordering", () => {
  assert.equal(canonicalFromHtml('<link href="https://illcoai.tech/products/lyric-video-forge" rel="canonical">'), "https://illcoai.tech/products/lyric-video-forge");
  assert.equal(canonicalFromHtml("<link rel='canonical' href='https://illcoai.tech/'>"), "https://illcoai.tech/");
  assert.equal(canonicalMatches('<link rel="canonical" href="https://illcoai.tech/">', "https://illcoai.tech/"), true);
  assert.equal(canonicalMatches('<link rel="canonical" href="https://www.illcoai.tech/">', "https://illcoai.tech/"), false);
});

test("requires a permanent same-path apex redirect, not a 200 or incorrect host", () => {
  assert.equal(isPermanentWwwRedirect(308, "https://illcoai.tech/"), true);
  assert.equal(isPermanentWwwRedirect(301, "https://illcoai.tech/products/lyric-video-forge", "/products/lyric-video-forge"), true);
  assert.equal(isPermanentWwwRedirect(302, "https://illcoai.tech/"), false);
  assert.equal(isPermanentWwwRedirect(308, "https://illcoai.com/"), false);
  assert.equal(isPermanentWwwRedirect(308, "https://illcoai.tech/", "/products/lyric-video-forge"), false);
});

test("recognizes the exact single-render price, not unrelated $10 mentions", () => {
  assert.equal(containsCurrentLyricVideoPrice("<p>Pay $10 for one render credit.</p>"), true);
  assert.equal(containsCurrentLyricVideoPrice("<p>$10 per successful MP4 render</p>"), true);
  assert.equal(containsCurrentLyricVideoPrice("<p>$297 lyric video package</p>"), false);
});

test("reports inaccessible live sources as blocked rather than fabricated passes", async () => {
  const fetcher = async () => ({ status: null, location: null, body: "", contentType: "", error: "offline fixture" });
  const report = await audit(fetcher);
  assert.equal(report.counts.PASS || 0, 0);
  assert.ok(report.counts.BLOCKED >= 8);
  assert.ok(report.checks.some((check) => check.id === "GEO-LIVE-17-KEYWORDS" && check.state === "NOT VERIFIED"));
});
