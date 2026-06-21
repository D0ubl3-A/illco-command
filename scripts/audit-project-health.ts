import fs from "node:fs/promises";
import path from "node:path";

import { products } from "../lib/deployments";

type HealthStatus = "healthy" | "degraded" | "offline";

const outputPath = path.resolve("data/project-health.json");
const concurrency = Number(process.env.HEALTH_CONCURRENCY || 8);

function titleFromHtml(html: string) {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || null;
}

async function fetchWithTimeout(url: string, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "ILLCO Command health audit",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function classify(statusCode: number): HealthStatus {
  if (statusCode >= 200 && statusCode < 400) return "healthy";
  if (statusCode === 401 || statusCode === 403 || statusCode === 429) return "degraded";
  return "offline";
}

async function auditProject(product: (typeof products)[number]) {
  if (!product.productionUrl) {
    return {
      id: product.id,
      record: {
        status: "offline" as HealthStatus,
        statusCode: null,
        checkedAt: new Date().toISOString(),
        title: null,
        error: "No production URL assigned.",
      },
    };
  }

  try {
    const response = await fetchWithTimeout(product.productionUrl);
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("text/html") ? await response.text() : "";
    return {
      id: product.id,
      record: {
        status: classify(response.status),
        statusCode: response.status,
        checkedAt: new Date().toISOString(),
        title: body ? titleFromHtml(body) : null,
        error: null,
      },
    };
  } catch (error) {
    return {
      id: product.id,
      record: {
        status: "offline" as HealthStatus,
        statusCode: null,
        checkedAt: new Date().toISOString(),
        title: null,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function runPool<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  let index = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (index < items.length) {
        const current = items[index++];
        results.push(await worker(current));
      }
    }),
  );
  return results;
}

async function main() {
  const audited = await runPool(products, auditProject);
  const projects = Object.fromEntries(audited.map(({ id, record }) => [id, record]));
  const values = Object.values(projects);
  const summary = {
    checked: values.length,
    healthy: values.filter((record) => record.status === "healthy").length,
    degraded: values.filter((record) => record.status === "degraded").length,
    offline: values.filter((record) => record.status === "offline").length,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), summary, projects }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
