import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("free lead funnel separates the sample from the paid list", () => {
  const page = read("app/free-leads/page.tsx");
  assert.match(page, /Free sample · Full lists for sale/);
  assert.match(page, /Get a free lead sample/);
  assert.match(page, /Price the full list/);
  assert.match(page, /available record count/);
  assert.match(page, /not a claim that every combination already contains verified records/);
  assert.match(page, /source, availability, refresh date, license, and price|source category, refresh date, permitted use/i);
  assert.match(page, /serviceId="free-b2b-lead-sample"/);
});

test("free lead funnel exposes a searchable, categorized niche catalog", () => {
  const catalog = read("components/niche-lead-catalog.tsx");
  assert.match(catalog, /Search niches/);
  assert.match(catalog, /Home services/);
  assert.match(catalog, /Health and wellness/);
  assert.match(catalog, /Professional services/);
  assert.match(catalog, /Automotive and industrial/);
  assert.match(catalog, /B2B and technology/);
  assert.match(catalog, /Custom niches and larger niche × geography requests/);
});

test("free lead funnel is included in the sitemap", () => {
  assert.match(read("app/sitemap.ts"), /\$\{siteUrl\}\/free-leads/);
});
