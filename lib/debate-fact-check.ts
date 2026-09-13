export type FactVerdict = "true" | "false" | "unverified";

export type FactCheck = {
  claim: string;
  verdict: FactVerdict;
  explanation: string;
  confidence: number;
  sources: Array<{ title: string; url: string }>;
};

export function normalizeFactCheck(value: Partial<FactCheck>): FactCheck {
  const verdict: FactVerdict = value.verdict === "true" || value.verdict === "false" ? value.verdict : "unverified";
  return {
    claim: String(value.claim || "").trim(),
    verdict,
    explanation: String(value.explanation || "Not enough reliable evidence was returned.").trim(),
    confidence: Math.max(0, Math.min(100, Number(value.confidence) || 0)),
    sources: Array.isArray(value.sources)
      ? value.sources.filter((source) => source?.title && /^https?:\/\//.test(source?.url || "")).slice(0, 3)
      : [],
  };
}

