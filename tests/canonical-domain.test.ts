import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import nextConfig from "../next.config";

const commercialRedirects: Record<string, string> = {
  "/local": "https://illcoai.com/services",
  "/henderson-ai-automation": "https://illcoai.com/services",
  "/henderson/ai-consulting": "https://illcoai.com/ai-consulting-henderson",
  "/henderson/ai-receptionist": "https://illcoai.com/services",
  "/henderson/ai-automation": "https://illcoai.com/services",
  "/henderson/web-design": "https://illcoai.com/services",
  "/las-vegas/ai-agency": "https://illcoai.com/ai-agency-las-vegas",
  "/las-vegas/ai-consulting": "https://illcoai.com/ai-agency-las-vegas",
  "/las-vegas/ai-receptionist": "https://illcoai.com/ai-receptionist-las-vegas",
  "/las-vegas/ai-automation": "https://illcoai.com/small-business-automation-las-vegas",
  "/las-vegas/small-business-automation": "https://illcoai.com/small-business-automation-las-vegas",
  "/las-vegas/ai-lead-generation": "https://illcoai.com/ai-lead-generation-las-vegas",
  "/las-vegas/ai-website-design": "https://illcoai.com/ai-website-design-las-vegas",
  "/las-vegas/missed-call-text-back": "https://illcoai.com/ai-receptionist-las-vegas",
  "/las-vegas/ai-quote-builder-for-contractors": "https://illcoai.com/services",
};

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

test("commercial and local intent permanently redirects from .tech to .com", async () => {
  const redirects = await nextConfig.redirects?.();
  assert.ok(redirects, "Expected Next.js redirects to be configured.");

  for (const [source, destination] of Object.entries(commercialRedirects)) {
    const redirect = redirects.find((entry) => entry.source === source);
    assert.ok(redirect, `Missing commercial redirect for ${source}`);
    assert.equal(redirect.destination, destination, `Wrong owner for ${source}`);
    assert.equal(redirect.permanent, true, `${source} must be permanent`);
  }
});

test(".tech sitemap does not advertise redirected local commercial routes", () => {
  const sitemapSource = fs.readFileSync(path.join(process.cwd(), "app", "sitemap.ts"), "utf8");

  for (const source of Object.keys(commercialRedirects)) {
    assert.equal(
      sitemapSource.includes(`${siteUrl}${source}`),
      false,
      `Redirected local route remains in .tech sitemap: ${source}`,
    );
  }
});

test("Las Vegas consulting source cannot regress to Henderson locality", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "app", "las-vegas", "ai-consulting", "page.tsx"),
    "utf8",
  );

  assert.match(source, /city="Las Vegas"/);
  assert.match(source, /AI Consulting Las Vegas NV/);
  assert.doesNotMatch(source, /Henderson businesses/i);
  assert.doesNotMatch(source, /illcoai\.tech\/henderson\/ai-consulting/i);
});

test("source tree contains no malformed 'What does a ai' FAQ copy", () => {
  const roots = ["app", "components", "lib"];

  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });

  for (const root of roots) {
    for (const file of walk(path.join(process.cwd(), root))) {
      if (!/\.(?:ts|tsx|js|jsx|md|json)$/i.test(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      assert.equal(
        source.toLowerCase().includes("what does a " + "ai"),
        false,
        `Malformed AI article copy found in ${path.relative(process.cwd(), file)}`,
      );
    }
  }
});
