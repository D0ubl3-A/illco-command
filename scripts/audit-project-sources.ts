import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { products } from "../lib/deployments";

type GithubRepo = {
  name: string;
  url: string;
  updatedAt: string;
  isPrivate: boolean;
  defaultBranchRef?: { name?: string | null } | null;
};

type HealthRecord = {
  status: "healthy" | "degraded" | "offline";
  statusCode: number | null;
  checkedAt: string;
  title: string | null;
  error: string | null;
};

type CompletionStatus = "complete" | "needs-repair" | "needs-source" | "needs-deploy" | "missing-source";

const outputPath = path.resolve("data/project-sources.json");
const healthPath = path.resolve("data/project-health.json");
const githubOwners = (process.env.PROJECT_GITHUB_OWNERS || "D0ubl3-A,aaronalltonai-ship-it")
  .split(",")
  .map((owner) => owner.trim())
  .filter(Boolean);
const rootScanConfig = [
  { root: "D:\\workspace", depth: 2 },
  { root: "D:\\", depth: 1 },
  { root: "D:\\repos", depth: 2 },
  { root: "D:\\projects", depth: 2 },
  { root: "D:\\workspace\\01-projects", depth: 2 },
  { root: "D:\\workspace\\04-builds", depth: 2 },
  { root: "C:\\Users\\aaron\\OneDrive\\Videos", depth: 1 },
];
const sourceAliasesByProductId: Record<string, string[]> = {
  "ai-companions-recovered": ["illco-command"],
  "ai-companion-conversational-intake": ["illco-command"],
  "ai-companion-prompt-studio": ["illco-command"],
  "ai-companion-content-production": ["illco-command"],
  "ai-companion-sales-agent-handoff": ["illco-command"],
  "ai-companion-command-routing": ["illco-command"],
  "ai-companion-workspace-access": ["illco-command"],
  "green-gator-pools": ["green-gator-pool-cleaning"],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withoutCommonDeploymentSuffix(value: string) {
  return value
    .replace(/-(illcoai|deploy|vercel|preview|cloud|app|site|repo|node|rust)$/g, "")
    .replace(/-(alpha|beta|gamma|delta|eta|khaki|orpin|tawny|ten|one|two|seven|eight)$/g, "");
}

function aliasesForProduct(product: (typeof products)[number]) {
  const aliases = new Set<string>();
  const add = (value?: string | null) => {
    if (!value) return;
    const slug = slugify(value);
    if (!slug) return;
    aliases.add(slug);
    aliases.add(withoutCommonDeploymentSuffix(slug));
  };

  add(product.id);
  add(product.name);
  for (const alias of sourceAliasesByProductId[product.id] || []) {
    add(alias);
  }
  if (product.productionUrl) {
    const host = new URL(product.productionUrl).hostname.split(".")[0];
    add(host);
  }

  return Array.from(aliases).filter(Boolean);
}

function isRelatedName(alias: string, candidate: string) {
  if (alias === candidate) return "exact";
  if (alias.length < 7 || candidate.length < 7) return null;
  if (candidate.startsWith(`${alias}-`) || alias.startsWith(`${candidate}-`)) return "prefix";
  if (withoutCommonDeploymentSuffix(alias) === withoutCommonDeploymentSuffix(candidate)) return "suffix-trim";
  return null;
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectLocalDirectories(root: string, depth: number, seen = new Set<string>()) {
  const results: { name: string; normalizedName: string; path: string }[] = [];
  if (depth < 0 || seen.has(root) || !(await pathExists(root))) return results;
  seen.add(root);

  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "$RECYCLE.BIN") continue;
    const directoryPath = path.join(root, entry.name);
    results.push({ name: entry.name, normalizedName: slugify(entry.name), path: directoryPath });
    if (depth > 0) {
      results.push(...(await collectLocalDirectories(directoryPath, depth - 1, seen)));
    }
  }

  return results;
}

async function collectAllLocalDirectories() {
  const byPath = new Map<string, { name: string; normalizedName: string; path: string }>();
  for (const { root, depth } of rootScanConfig) {
    for (const directory of await collectLocalDirectories(root, depth)) {
      byPath.set(directory.path.toLowerCase(), directory);
    }
  }
  return Array.from(byPath.values());
}

function listGithubRepos(owner: string) {
  try {
    const output = execFileSync(
      "gh",
      ["repo", "list", owner, "--limit", "1000", "--json", "name,url,updatedAt,isPrivate,defaultBranchRef"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return JSON.parse(output) as GithubRepo[];
  } catch {
    return [] as GithubRepo[];
  }
}

async function readHealth() {
  try {
    const content = await fs.readFile(healthPath, "utf8");
    return JSON.parse(content).projects as Record<string, HealthRecord>;
  } catch {
    return {} as Record<string, HealthRecord>;
  }
}

function classifyCompletion({
  hasSource,
  hasProductionUrl,
  health,
}: {
  hasSource: boolean;
  hasProductionUrl: boolean;
  health?: HealthRecord;
}): CompletionStatus {
  if (hasProductionUrl && health?.status === "healthy" && hasSource) return "complete";
  if (hasProductionUrl && health?.status === "healthy" && !hasSource) return "needs-source";
  if (!hasProductionUrl && hasSource) return "needs-deploy";
  if (hasSource) return "needs-repair";
  return "missing-source";
}

function findMatches<T extends { normalizedName: string }>(aliases: string[], candidates: T[]) {
  return candidates
    .map((candidate) => {
      const match = aliases
        .map((alias) => ({ alias, matchType: isRelatedName(alias, candidate.normalizedName) }))
        .find((result) => result.matchType);
      return match ? { ...candidate, alias: match.alias, matchType: match.matchType } : null;
    })
    .filter((candidate): candidate is T & { alias: string; matchType: string } => Boolean(candidate));
}

async function main() {
  const generatedAt = new Date().toISOString();
  const healthById = await readHealth();
  const localDirectories = await collectAllLocalDirectories();
  const githubRepos = githubOwners.flatMap((owner) =>
    listGithubRepos(owner).map((repo) => ({
      ...repo,
      owner,
      normalizedName: slugify(repo.name),
    })),
  );

  const records = Object.fromEntries(
    products.map((product) => {
      const aliases = aliasesForProduct(product);
      const localMatches = findMatches(aliases, localDirectories).slice(0, 8);
      const githubMatches = findMatches(aliases, githubRepos).slice(0, 8);
      const hasSource = localMatches.length > 0 || githubMatches.length > 0;
      const health = healthById[product.id] || null;
      const completionStatus = classifyCompletion({
        hasSource,
        hasProductionUrl: Boolean(product.productionUrl),
        health: health || undefined,
      });

      return [
        product.id,
        {
          id: product.id,
          name: product.name,
          displayName: product.displayName,
          productionUrl: product.productionUrl,
          completionStatus,
          sourceStatus:
            localMatches.length && githubMatches.length
              ? "local-and-github"
              : localMatches.length
                ? "local-only"
                : githubMatches.length
                  ? "github-only"
                  : "not-found",
          health,
          aliases,
          localPaths: localMatches.map((match) => ({
            path: match.path,
            name: match.name,
            matchType: match.matchType,
            alias: match.alias,
          })),
          githubRepos: githubMatches.map((match) => ({
            owner: match.owner,
            name: match.name,
            url: match.url,
            updatedAt: match.updatedAt,
            isPrivate: match.isPrivate,
            defaultBranch: match.defaultBranchRef?.name || null,
            matchType: match.matchType,
            alias: match.alias,
          })),
        },
      ];
    }),
  );

  const values = Object.values(records);
  const summary = {
    checked: values.length,
    liveProductionUrls: values.filter((record) => record.productionUrl).length,
    complete: values.filter((record) => record.completionStatus === "complete").length,
    needsRepair: values.filter((record) => record.completionStatus === "needs-repair").length,
    needsSource: values.filter((record) => record.completionStatus === "needs-source").length,
    needsDeploy: values.filter((record) => record.completionStatus === "needs-deploy").length,
    missingSource: values.filter((record) => record.completionStatus === "missing-source").length,
    localSource: values.filter((record) => record.localPaths.length > 0).length,
    githubSource: values.filter((record) => record.githubRepos.length > 0).length,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({ generatedAt, githubOwners, summary, projects: records }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
