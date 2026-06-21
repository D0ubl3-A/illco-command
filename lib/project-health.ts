import healthSnapshot from "@/data/project-health.json";

export type ProjectHealthStatus = "healthy" | "degraded" | "offline" | "unknown";

export type ProjectHealthRecord = {
  status: ProjectHealthStatus;
  statusCode?: number | null;
  checkedAt?: string | null;
  title?: string | null;
  error?: string | null;
};

type ProjectHealthSnapshot = {
  generatedAt: string | null;
  summary: {
    checked: number;
    healthy: number;
    degraded: number;
    offline: number;
  };
  projects: Record<string, ProjectHealthRecord>;
};

export const projectHealth = healthSnapshot as ProjectHealthSnapshot;

export function getProjectHealth(projectId: string): ProjectHealthRecord {
  return projectHealth.projects[projectId] || { status: "unknown", checkedAt: null };
}
