import projectSources from "@/data/project-sources.json";
import type { products } from "@/lib/deployments";

export type ProjectCompletionStatus =
  | "complete"
  | "needs-repair"
  | "needs-source"
  | "needs-deploy"
  | "missing-source";

export type ProjectSourceStatus = "local-and-github" | "local-only" | "github-only" | "not-found";

export type ProjectCompletionRecord = {
  id: string;
  name: string;
  displayName: string;
  productionUrl: string | null;
  completionStatus: ProjectCompletionStatus;
  sourceStatus: ProjectSourceStatus;
  health: {
    status: "healthy" | "degraded" | "offline";
    statusCode: number | null;
    checkedAt: string;
    title: string | null;
    error: string | null;
  } | null;
  aliases: string[];
  localPaths: Array<{
    path: string;
    name: string;
    matchType: string;
    alias: string;
  }>;
  githubRepos: Array<{
    owner: string;
    name: string;
    url: string;
    updatedAt: string;
    isPrivate: boolean;
    defaultBranch: string | null;
    matchType: string;
    alias: string;
  }>;
};

type Product = (typeof products)[number];

export const projectCompletionSummary = projectSources.summary;
export const projectCompletionGeneratedAt = projectSources.generatedAt;
export const projectCompletionOwners = projectSources.githubOwners;

export type GithubProofLink = {
  id: string;
  productId: string;
  productName: string;
  owner: string;
  name: string;
  url: string;
  updatedAt: string;
  sourceStatus: ProjectSourceStatus;
  completionStatus: ProjectCompletionStatus;
};

export function projectCompletionOwnersText() {
  return projectCompletionOwners.join(", ");
}

export function getGithubProofLinks(limit = 8): GithubProofLink[] {
  const seen = new Set<string>();
  const completionRank: Record<ProjectCompletionStatus, number> = {
    complete: 0,
    "needs-repair": 1,
    "needs-deploy": 2,
    "needs-source": 3,
    "missing-source": 4,
  };

  return Object.values(projectSources.projects as Record<string, ProjectCompletionRecord>)
    .flatMap((project) =>
      project.githubRepos.map((repo) => ({
        id: `${project.id}:${repo.owner}/${repo.name}`,
        productId: project.id,
        productName: project.displayName || project.name,
        owner: repo.owner,
        name: repo.name,
        url: repo.url,
        updatedAt: repo.updatedAt,
        sourceStatus: project.sourceStatus,
        completionStatus: project.completionStatus,
      })),
    )
    .filter((repo) => {
      if (!repo.url || seen.has(repo.url)) return false;
      seen.add(repo.url);
      return true;
    })
    .sort(
      (left, right) =>
        completionRank[left.completionStatus] - completionRank[right.completionStatus] ||
        (Date.parse(right.updatedAt) || 0) - (Date.parse(left.updatedAt) || 0) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, limit);
}

export function getProjectCompletionRecord(productId: Product["id"]) {
  return (projectSources.projects as Record<string, ProjectCompletionRecord>)[productId] || null;
}

export function completionStatusLabel(status?: ProjectCompletionStatus | null) {
  if (status === "complete") return "Complete";
  if (status === "needs-repair") return "Repair";
  if (status === "needs-source") return "Find Source";
  if (status === "needs-deploy") return "Deploy";
  if (status === "missing-source") return "Missing";
  return "Unknown";
}

export function sourceStatusLabel(status?: ProjectSourceStatus | null) {
  if (status === "local-and-github") return "Local + GitHub";
  if (status === "local-only") return "Local";
  if (status === "github-only") return "GitHub";
  return "No Source";
}
