import { Agent, Runner } from "@openai/agents";

import { BRAND } from "@/lib/brand";
import { getMasterAgentCatalogItems } from "@/lib/master-agent";
import { nexoraVentureSkillMarkdown } from "@/lib/nexora-venture-skill";

const MODEL = "gpt-5.6-sol" as const;

export type NexoraVentureInput = {
  goal: string;
  budgetUsd?: number;
  evidence?: string;
  constraints?: string[];
};

export type NexoraVentureStage = {
  name: "demand-scout" | "offer-architect" | "growth-operator" | "auditor" | "ceo-allocator";
  output: string;
};

export type NexoraVentureResult = {
  ok: true;
  model: typeof MODEL;
  brand: string;
  budgetUsd: number;
  stages: NexoraVentureStage[];
  finalDecision: string;
  approvalRequired: boolean;
  approvalReasons: string[];
};

function makeAgent(name: string, instructions: string, reasoning: "high" | "xhigh" = "high") {
  return new Agent({
    name,
    model: MODEL,
    modelSettings: {
      reasoning: { effort: reasoning },
      text: { verbosity: "medium" },
    },
    instructions: `${nexoraVentureSkillMarkdown}\n\n## Your role\n${instructions}`,
  });
}

const demandScout = makeAgent(
  "Nexora Demand Scout",
  `Find the strongest reachable buyer/problem pair for the stated goal using only the evidence supplied and the catalog context.\n\nReturn:\n- target buyer\n- painful problem\n- existing buying signal\n- reachable channel\n- evidence labels\n- disqualifiers\n- top 3 opportunities ranked\n- cheapest safe validation test\n\nReject weak markets instead of forcing an idea.`,
);

const offerArchitect = makeAgent(
  "Nexora Offer Architect",
  `Use the Demand Scout packet and the existing Nexora catalog to assemble the best offer. Reuse existing products, payment paths, demos, and fulfillment capability before proposing net-new development.\n\nReturn:\n- offer name\n- buyer\n- promised outcome\n- included existing capabilities\n- price hypothesis\n- fulfillment path\n- proof needed\n- acceptance test\n- what must NOT be claimed yet\n- one strongest alternative offer.`,
);

const growthOperator = makeAgent(
  "Nexora Growth Operator",
  `Design the smallest measurable acquisition experiment for the proposed offer. Stay within the stated budget. Do not claim or perform external actions.\n\nReturn:\n- channel\n- target sample\n- message angle\n- landing/CTA requirement\n- exact budget cap\n- primary metric\n- success threshold\n- failure threshold\n- time/sample requirement\n- attribution plan\n- contribution-profit assumptions\n- success next action\n- failure next action.`,
);

const auditor = makeAgent(
  "Nexora Revenue Auditor",
  `Try to prove the current recommendation wrong. Look for fake demand, weak attribution, hidden fulfillment cost, duplicate-market assumptions, SEO contamination, brand confusion, checkout mismatch, legal/platform risk, missing proof, and selection bias.\n\nReturn:\n- strongest case against proceeding\n- unsupported assumptions\n- evidence quality problems\n- likely failure modes\n- strongest competing strategy\n- what evidence would reverse your criticism\n- PASS, PASS_WITH_CHANGES, or FAIL.`,
  "xhigh",
);

const ceoAllocator = makeAgent(
  "Nexora CEO Allocator",
  `Make the final decision from the full packet. Optimize for expected contribution profit, learning value, reversibility, and risk. Do not hide a decisive weakness inside an average score.\n\nChoose exactly one status: SCALE, MODIFY, HOLD, KILL, or REQUEST_APPROVAL.\n\nReturn:\nSTATUS: <status>\nBEST CHOICE: <one clear action>\nWHY: <concise evidence-based rationale>\nBUDGET: <maximum approved experiment spend from the caller, never more>\nSMALLEST TEST: <test>\nSUCCESS: <observable threshold>\nFAILURE: <observable threshold>\nSTRONGEST OBJECTION: <best case against this choice>\nREVERSAL EVIDENCE: <what would change the decision>\nCONFIDENCE: HIGH | MEDIUM | LOW\nPROPOSED ACTIONS: <actions only; do not execute risky/external actions>.`,
  "xhigh",
);

function catalogContext() {
  return getMasterAgentCatalogItems()
    .slice(0, 80)
    .map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      category: item.category,
      summary: item.summary,
      status: item.statusLabel,
      plan: item.planLabel,
      canCheckout: item.canCheckout,
      canOpen: item.canOpen,
      proof: item.proofLabel,
      detailsHref: item.detailsHref,
    }));
}

function stagePrompt(input: NexoraVentureInput, prior: NexoraVentureStage[], task: string) {
  const budgetUsd = Math.max(0, Math.min(input.budgetUsd ?? 100, 10_000));
  return JSON.stringify(
    {
      brand: BRAND.name,
      goal: input.goal,
      experimentBudgetUsd: budgetUsd,
      evidence: input.evidence || "No external evidence supplied yet.",
      constraints: input.constraints || [],
      catalog: catalogContext(),
      priorStages: prior,
      task,
    },
    null,
    2,
  );
}

async function runStage(
  runner: Runner,
  agent: Agent,
  name: NexoraVentureStage["name"],
  input: NexoraVentureInput,
  stages: NexoraVentureStage[],
  task: string,
) {
  const result = await runner.run(agent, stagePrompt(input, stages, task), { maxTurns: 6 });
  const output = String(result.finalOutput || "").trim();
  const stage = { name, output } satisfies NexoraVentureStage;
  stages.push(stage);
  return stage;
}

function approvalScan(text: string) {
  const gates: Array<[RegExp, string]> = [
    [/\bdeploy|production release|publish to production\b/i, "Production deployment"],
    [/\bspend|ad spend|paid ads|purchase|buy\b/i, "External spending"],
    [/\brefund|credit customer\b/i, "Refund or customer credit"],
    [/\bcontract|legal filing|tax filing|sign agreement\b/i, "Legal or tax commitment"],
    [/\bdelete|drop database|reset production|rotate credentials|change ownership\b/i, "Destructive or privileged change"],
    [/\bdebt|loan|financing|bank account\b/i, "Banking, debt, or financing action"],
  ];

  return gates.filter(([pattern]) => pattern.test(text)).map(([, reason]) => reason);
}

export async function runNexoraVenturePipeline(input: NexoraVentureInput): Promise<NexoraVentureResult> {
  if (!input.goal.trim()) throw new Error("A venture goal is required.");

  const budgetUsd = Math.max(0, Math.min(input.budgetUsd ?? 100, 10_000));
  const normalizedInput = { ...input, budgetUsd };
  const runner = new Runner({ model: MODEL });
  const stages: NexoraVentureStage[] = [];

  await runStage(runner, demandScout, "demand-scout", normalizedInput, stages, "Find the strongest demand opportunity.");
  await runStage(runner, offerArchitect, "offer-architect", normalizedInput, stages, "Turn the best demand signal into an offer using existing catalog capabilities.");
  await runStage(runner, growthOperator, "growth-operator", normalizedInput, stages, "Design a bounded acquisition experiment.");
  await runStage(runner, auditor, "auditor", normalizedInput, stages, "Attack the proposed experiment and identify reasons not to proceed.");
  const finalStage = await runStage(runner, ceoAllocator, "ceo-allocator", normalizedInput, stages, "Make the final allocation decision after considering the auditor.");

  const approvalReasons = approvalScan(finalStage.output);

  return {
    ok: true,
    model: MODEL,
    brand: BRAND.name,
    budgetUsd,
    stages,
    finalDecision: finalStage.output,
    approvalRequired: approvalReasons.length > 0 || /STATUS:\s*REQUEST_APPROVAL/i.test(finalStage.output),
    approvalReasons,
  };
}
