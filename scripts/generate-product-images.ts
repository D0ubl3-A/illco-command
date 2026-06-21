import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

import { products } from "../lib/deployments";
import { getProductViralImageSvg } from "../lib/product-marketing";

const outputDir = join(process.cwd(), "public", "products", "generated");
const width = 1600;
const height = 900;

function imageHtml(svg: string) {
  const inlineSvg = svg.replace(/<\?xml[^>]*>\s*/u, "");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { width: ${width}px; height: ${height}px; margin: 0; overflow: hidden; background: #05070d; }
      svg { display: block; width: ${width}px; height: ${height}px; }
    </style>
  </head>
  <body>
    ${inlineSvg}
  </body>
</html>`;
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch();
  let page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

  try {
    for (const product of products) {
      const svg = getProductViralImageSvg(product);
      const outputPath = join(outputDir, `${product.id}.jpg`);
      try {
        await page.setContent(imageHtml(svg), { waitUntil: "networkidle" });
        await page.waitForTimeout(150);
        await page.screenshot({
          path: outputPath,
          type: "jpeg",
          quality: 94,
          clip: { x: 0, y: 0, width, height },
        });
      } catch (error) {
        await page.close().catch(() => undefined);
        page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        await page.setContent(imageHtml(svg), { waitUntil: "networkidle" });
        await page.waitForTimeout(150);
        await page.screenshot({
          path: outputPath,
          type: "jpeg",
          quality: 94,
          clip: { x: 0, y: 0, width, height },
        });
        console.warn(`retried ${product.id}: ${error instanceof Error ? error.message : "capture failed"}`);
      }
      console.log(`generated ${product.id}`);
    }
  } finally {
    await page.close().catch(() => undefined);
    await browser.close();
  }

  console.log(`Generated ${products.length} product images in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
