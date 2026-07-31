import { createHash } from "node:crypto";
import { validateActionGrammar, validateCharacterBible, validateFxBible, type ActionGrammar, type CharacterBible, type FxBible, type ValidationIssue } from "./bibles";

export type PromptBinding = {
  promptId: string;
  version: number;
  assetId: string;
  promptText: string;
  negativePrompt: string;
  provider: string;
  model: string;
  modelVersion: string;
  parameters: Record<string, unknown>;
  bibleKind: "character" | "fx";
  bibleId: string;
  bibleVersion: number;
  bibleHash: string;
  grammarId?: string;
  grammarVersion?: number;
  grammarHash?: string;
};

export type BindingResult = {
  passed: boolean;
  issues: ValidationIssue[];
  promptHash: string;
  bibleHash: string;
  grammarHash?: string;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashCanonical(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function validatePromptBinding(binding: PromptBinding, bible: CharacterBible | FxBible, grammar?: ActionGrammar): BindingResult {
  const issues: ValidationIssue[] = [];
  if (!binding.promptId.trim()) issues.push({ controlId: "PROMPT-ID", message: "promptId is required" });
  if (!Number.isInteger(binding.version) || binding.version < 1) issues.push({ controlId: "PROMPT-VERSION", message: "version must be a positive integer" });
  if (!binding.assetId.trim()) issues.push({ controlId: "PROMPT-ASSET", message: "assetId is required" });
  if (!binding.promptText.trim()) issues.push({ controlId: "PROMPT-TEXT", message: "promptText is required" });
  if (!binding.negativePrompt.trim()) issues.push({ controlId: "PROMPT-NEGATIVE", message: "negativePrompt is required" });
  if (!binding.provider.trim() || !binding.model.trim() || !binding.modelVersion.trim()) issues.push({ controlId: "PROMPT-MODEL", message: "provider, model, and modelVersion are required" });

  const expectedKind = "originalName" in bible ? "character" : "fx";
  if (binding.bibleKind !== expectedKind) issues.push({ controlId: "PROMPT-BIBLE-KIND", message: "binding bible kind does not match supplied bible" });
  if (binding.bibleId !== bible.bibleId || binding.bibleVersion !== bible.version) issues.push({ controlId: "PROMPT-BIBLE-IDENTITY", message: "binding references the wrong bible ID or version" });
  if (!bible.locked) issues.push({ controlId: "PROMPT-BIBLE-LOCK", message: "prompt may only reference a locked bible" });

  const bibleIssues = expectedKind === "character" ? validateCharacterBible(bible as CharacterBible) : validateFxBible(bible as FxBible);
  issues.push(...bibleIssues);
  const bibleHash = hashCanonical(bible);
  if (binding.bibleHash !== bibleHash) issues.push({ controlId: "PROMPT-BIBLE-HASH", message: "binding bible hash does not match canonical content" });

  let grammarHash: string | undefined;
  const grammarFields = [binding.grammarId, binding.grammarVersion, binding.grammarHash].filter((value) => value !== undefined).length;
  if (grammarFields !== 0 && grammarFields !== 3) issues.push({ controlId: "PROMPT-GRAMMAR-FIELDS", message: "grammar ID, version, and hash must be supplied together" });
  if (grammar) {
    issues.push(...validateActionGrammar(grammar));
    grammarHash = hashCanonical(grammar);
    if (binding.grammarId !== grammar.grammarId || binding.grammarVersion !== grammar.version) issues.push({ controlId: "PROMPT-GRAMMAR-IDENTITY", message: "binding references the wrong grammar ID or version" });
    if (binding.grammarHash !== grammarHash) issues.push({ controlId: "PROMPT-GRAMMAR-HASH", message: "binding grammar hash does not match canonical content" });
  } else if (grammarFields !== 0) {
    issues.push({ controlId: "PROMPT-GRAMMAR-MISSING", message: "binding references a grammar that was not supplied" });
  }

  const promptHash = hashCanonical({ ...binding, bibleHash, grammarHash });
  return { passed: issues.length === 0, issues, promptHash, bibleHash, grammarHash };
}
