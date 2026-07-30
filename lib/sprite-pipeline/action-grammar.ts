export type ActionGrammar = {
  action: string;
  requiredPhases: string[];
  optionalPhases: string[];
  illegalOrder: Array<[string, string]>;
  minFrames: number;
  maxFrames: number;
  contactPhase?: string;
  recoveryPhase?: string;
};

export type ActionSequence = {
  action: string;
  phases: string[];
  frameCount: number;
  facing: "left" | "right" | "front" | "back";
  direction: "left" | "right" | "forward" | "backward" | "stationary";
};

export type GrammarValidation = {
  passed: boolean;
  failures: string[];
};

export function validateActionGrammar(grammar: ActionGrammar): void {
  if (!grammar.action.trim()) throw new Error("action is required");
  if (!Number.isInteger(grammar.minFrames) || grammar.minFrames < 1) throw new Error("minFrames must be positive");
  if (!Number.isInteger(grammar.maxFrames) || grammar.maxFrames < grammar.minFrames) throw new Error("maxFrames must be >= minFrames");
  const all = [...grammar.requiredPhases, ...grammar.optionalPhases];
  if (new Set(all).size !== all.length) throw new Error("phase names must be unique");
  for (const [before, after] of grammar.illegalOrder) {
    if (!all.includes(before) || !all.includes(after)) throw new Error("illegalOrder references unknown phase");
  }
  if (grammar.contactPhase && !all.includes(grammar.contactPhase)) throw new Error("contactPhase must exist in grammar");
  if (grammar.recoveryPhase && !all.includes(grammar.recoveryPhase)) throw new Error("recoveryPhase must exist in grammar");
}

export function validateActionSequence(grammar: ActionGrammar, sequence: ActionSequence): GrammarValidation {
  validateActionGrammar(grammar);
  const failures: string[] = [];
  if (sequence.action !== grammar.action) failures.push(`Action mismatch: expected ${grammar.action}`);
  if (sequence.frameCount < grammar.minFrames || sequence.frameCount > grammar.maxFrames) {
    failures.push(`Frame count ${sequence.frameCount} outside ${grammar.minFrames}-${grammar.maxFrames}`);
  }
  const allowed = new Set([...grammar.requiredPhases, ...grammar.optionalPhases]);
  for (const phase of sequence.phases) if (!allowed.has(phase)) failures.push(`Unknown phase: ${phase}`);
  for (const required of grammar.requiredPhases) {
    if (!sequence.phases.includes(required)) failures.push(`Missing required phase: ${required}`);
  }
  for (const [before, after] of grammar.illegalOrder) {
    const beforeIndex = sequence.phases.indexOf(before);
    const afterIndex = sequence.phases.indexOf(after);
    if (beforeIndex !== -1 && afterIndex !== -1 && beforeIndex < afterIndex) {
      failures.push(`Illegal phase order: ${before} before ${after}`);
    }
  }
  if (grammar.contactPhase && grammar.recoveryPhase) {
    const contact = sequence.phases.indexOf(grammar.contactPhase);
    const recovery = sequence.phases.indexOf(grammar.recoveryPhase);
    if (contact !== -1 && recovery !== -1 && recovery <= contact) failures.push("Recovery must follow contact");
  }
  return { passed: failures.length === 0, failures };
}

export const CORE_ACTION_GRAMMARS: Record<string, ActionGrammar> = {
  punch: {
    action: "punch",
    requiredPhases: ["anticipation", "contact", "follow_through", "recovery"],
    optionalPhases: ["hold"],
    illegalOrder: [["recovery", "contact"], ["follow_through", "contact"]],
    minFrames: 4,
    maxFrames: 24,
    contactPhase: "contact",
    recoveryPhase: "recovery",
  },
  knockdown: {
    action: "knockdown",
    requiredPhases: ["impact", "fall", "ground_contact", "settle"],
    optionalPhases: ["bounce", "dazed_hold"],
    illegalOrder: [["settle", "ground_contact"], ["ground_contact", "impact"]],
    minFrames: 4,
    maxFrames: 40,
    contactPhase: "ground_contact",
    recoveryPhase: "settle",
  },
};
