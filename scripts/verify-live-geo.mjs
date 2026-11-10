/**
 * Read-only GEO production probe.
 * No checkout submissions, logins, customer records, or paid transactions.
 * Node.js 22+. Run: node scripts/verify-live-geo.mjs --out=artifacts/geo-live.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APEX = "https://illcoai.tech";
const WWW = "https://www.illcoai.tech";
const COMMERCIAL = "https://illcoai.com";

export function canonicalFromHtml(html) {
  const tags = String(html).match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\brel=["']canonical["']/i.test(tag)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i);
    if (href) return href[1].trim();
  }
  return null;
}

export function isPermanentWwwRedirect(status, location, requestedPath = "/") {
  if (status !== 301 && status !== 308) return false;
  if (!location) return false;
  try {
    const redirected = new URL(location, WWW);
    return redirected.origin === APEX &&
      redirected.pathname === requestedPath &&
      !redirected.username &&
      !redirected.password;
  } catch {
    return false;
  }
}

export function canonicalMatches(html, expected) {
  const canonical = canonicalFromHtml(html);
  if (!canonical) return false;
  try {
    return new URL(canonical, APEX).href === expected;
  } catch {
    return false;
  }
}

export function containsCurrentLyricVideoPrice(html) {
  const text = String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return /\$10(?:\.00)?\s+(?:per (?:successful )?(?:mp4 )?render|per video|for each successful)/i.test(text) ||
    /pay\s+\$10\s+for\s+(?:one|each)\s+(?:render|video)/i.test(text);
}

async function probe(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "iLLCo-GEO-ReadOnly-Audit/1.0", "Accept": "text/html,application/xml,text/plain" },
    });
    const contentType = response.headers.get("content-type") || "";
    const location = response.headers.get("location");
    const body = response.status >= 300 && response.status < 400
      ? ""
      : (await response.text()).slice(0, 1_500_000);
    return { status: response.status, contentType, location, body };
  } catch (error) {
    return { status: null, contentType: "", location: null, body: "", error: String(error) };
  }
}

function outcome(id, state, url, expected, observed, note = "") {
  return { id, state, url, expected, observed, note };
}

export async function audit(fetcher = probe) {
  const checks = [];
  const urls = [
    APEX + "/", WWW + "/", WWW + "/products/lyric-video-forge",
    APEX + "/products/lyric-video-forge", APEX + "/checkout/lyric-video-forge",
    APEX + "/verification", APEX + "/robots.txt", APEX + "/sitemap.xml",
    COMMERCIAL + "/",
  ];
  const results = await Promise.all(urls.map((u) => fetcher(u)));
  const [home, wwwHome, wwwProduct, product, checkout, verification, robots, sitemap, commercial] = results;
  const recordHttp = (id, url, result) => {
    const state = result.status === 200 ? "PASS" : result.status === null ? "BLOCKED" : "FAIL";
    checks.push(outcome(id, state, url, "HTTP 200", result.status ?? result.error ?? "unavailable"));
  };

  recordHttp("GEO-LIVE-01-HOME", urls[0], home);
  checks.push(outcome("GEO-LIVE-02-WWW", wwwHome.status === null ? "BLOCKED" :
    isPermanentWwwRedirect(wwwHome.status, wwwHome.location) ? "PASS" : "FAIL", urls[1],
    "301/308 to https://illcoai.tech/", { status: wwwHome.status, location: wwwHome.location, error: wwwHome.error }));
  checks.push(outcome("GEO-LIVE-03-WWW-PRODUCT", wwwProduct.status === null ? "BLOCKED" :
    isPermanentWwwRedirect(wwwProduct.status, wwwProduct.location, "/products/lyric-video-forge") ? "PASS" : "FAIL",
    urls[2], "Permanent redirect preserving product path",
    { status: wwwProduct.status, location: wwwProduct.location, error: wwwProduct.error }));

  recordHttp("GEO-LIVE-04-PRODUCT", urls[3], product);
  if (home.status === 200) {
    checks.push(outcome("GEO-LIVE-05-HOME-CANONICAL",
      canonicalMatches(home.body, urls[0]) ? "PASS" : "FAIL",
      urls[0], "Self-referencing homepage canonical", canonicalFromHtml(home.body)));
  }
  if (product.status === 200) {
    checks.push(outcome("GEO-LIVE-06-PRODUCT-CANONICAL",
      canonicalMatches(product.body, urls[3]) ? "PASS" : "FAIL",
      urls[3], "Self-referencing product canonical", canonicalFromHtml(product.body)));
    checks.push(outcome("GEO-LIVE-07-PRICE",
      containsCurrentLyricVideoPrice(product.body) ? "PASS" : "FAIL",
      urls[3], "$10 per successful render visible", containsCurrentLyricVideoPrice(product.body)));
  }

  checks.push(outcome("GEO-LIVE-08-CHECKOUT", checkout.status === null ? "BLOCKED" :
    ([200, 301, 302, 303, 307, 308].includes(checkout.status) ? "PASS" : "FAIL"),
    urls[4], "Public checkout entry page or sign-in redirect reachable (NOT a paid conversion)",
    { status: checkout.status, location: checkout.location, error: checkout.error }));

  recordHttp("GEO-LIVE-09-VERIFICATION", urls[5], verification);
  if (verification.status === 200) {
    const hasStaleRecord = /Lyric Video Forge/i.test(verification.body) &&
      /DEGRADED/i.test(verification.body) && /August 19, 2026/i.test(verification.body);
    checks.push(outcome("GEO-LIVE-10-VERIFICATION-FRESHNESS",
      hasStaleRecord ? "PARTIAL" : "NOT VERIFIED", urls[5],
      "Recent evidence-based end-to-end rendering verification", hasStaleRecord ? "August 19 degraded record" : "Manual inspection needed",
      "Never label the renderer verified on the basis of a product launch claim."));
  }

  recordHttp("GEO-LIVE-11-ROBOTS", urls[6], robots);
  if (robots.status === 200) {
    checks.push(outcome("GEO-LIVE-12-ROBOTS-SITEMAP",
      /Sitemap:\s*https:\/\/illcoai\.tech\/sitemap\.xml/i.test(robots.body) ? "PASS" : "FAIL",
      urls[6], "Advertises canonical sitemap URL", robots.body.slice(0, 300)));
  }
  recordHttp("GEO-LIVE-13-SITEMAP", urls[7], sitemap);
  if (sitemap.status === 200) {
    checks.push(outcome("GEO-LIVE-14-SITEMAP-CANONICAL",
      sitemap.body.includes("https://illcoai.tech/") ? "PASS" : "FAIL",
      urls[7], "Canonical hostname occurs in XML sitemap", sitemap.body.slice(0, 300)));
  }
  recordHttp("GEO-LIVE-15-COMMERCIAL", urls[8], commercial);

  // Paid fulfillment, AI citation rates, Search Console ranking, CWV and schema
  // eligibility require separate evidence; never infer them from a public GET.
  for (const [id, expected] of [
    ["GEO-LIVE-16-PAID-FULFILLMENT", "Test-mode signed payment -> exactly one credit -> completed MP4"],
    ["GEO-LIVE-17-KEYWORDS", "Fixed Search Console/SERP query, region, device, date and position exports"],
    ["GEO-LIVE-18-AI-CITATIONS", "Reproducible multi-engine prompt and citation samples"],
    ["GEO-LIVE-19-CWV", "Field/lab mobile performance measurements"],
    ["GEO-LIVE-20-SCHEMA", "Raw JSON-LD validation and visible-page fact parity"],
  ]) {
    checks.push(outcome(id, "NOT VERIFIED", "Requires appropriate authenticated or specialist evidence", expected, "Not measured"));
  }

  const counts = checks.reduce((acc, x) => (acc[x.state] = (acc[x.state] || 0) + 1, acc), {});
  return { observedAt: new Date().toISOString(), site: APEX, methodology: "Public read-only GET; redirect: manual; no payment or private account operations", checks, counts };
}

async function main() {
  const report = await audit();
  const out = process.argv.find((x) => x.startsWith("--out="))?.slice(6);
  if (out) {
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, JSON.stringify(report, null, 2) + "\n", "utf8");
  }
  console.log(JSON.stringify({ observedAt: report.observedAt, counts: report.counts, checks: report.checks }, null, 2));
  if (!process.argv.includes("--report-only") && report.counts.FAIL) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
