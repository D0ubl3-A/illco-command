import "server-only";

import { Codex, type ThreadItem, type Usage } from "@openai/codex-sdk";

import { env } from "@/lib/env";

export type CodexSdkRunResult = {
  finalResponse: string;
  itemCount: number;
  usage: Usage | null;
  threadId: string | null;
  items: Array<Pick<ThreadItem, "id" | "type">>;
};

const codexOutputSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    status: { type: "string", enum: ["ok", "action_required", "blocked"] },
    nextSteps: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
  },
  required: ["summary", "status", "nextSteps"],
  additionalProperties: false,
} as const;

export function getCodexSdkConfiguration() {
  return {
    ready: Boolean(env.codexApiKey),
    workspaceDirectory: env.codexWorkspaceDirectory,
    missing: env.codexApiKey ? [] : ["CODEX_API_KEY or OPENAI_API_KEY"],
  };
}

export async function runCodexSdkReadOnlyPrompt(prompt: string): Promise<CodexSdkRunResult> {
  const config = getCodexSdkConfiguration();
  if (!config.ready) {
    throw new Error("CODEX_API_KEY or OPENAI_API_KEY is required before Codex SDK runs can be enabled.");
  }

  const codex = new Codex({
    apiKey: env.codexApiKey,
    env: {
      PATH: process.env.PATH || "",
      NODE_ENV: process.env.NODE_ENV || "production",
    },
  });
  const thread = codex.startThread({
    workingDirectory: config.workspaceDirectory,
    skipGitRepoCheck: true,
    sandboxMode: "read-only",
    approvalPolicy: "never",
    networkAccessEnabled: false,
    webSearchMode: "disabled",
    modelReasoningEffort: "medium",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const turn = await thread.run(prompt, {
      signal: controller.signal,
      outputSchema: codexOutputSchema,
    });

    return {
      finalResponse: turn.finalResponse,
      itemCount: turn.items.length,
      usage: turn.usage,
      threadId: thread.id,
      items: turn.items.slice(-12).map((item) => ({ id: item.id, type: item.type })),
    };
  } finally {
    clearTimeout(timeout);
  }
}
