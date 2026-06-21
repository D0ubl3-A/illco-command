import axios from "axios";
import { ModerationResult } from "../types";

const POLICY_VERSION = "v1";
const riskyPatterns: Array<{ rule: string; test: RegExp; score: number }> = [
  { rule: "excessive_caps", test: /[A-Z]{15,}/, score: 25 },
  { rule: "link_spam", test: /(https?:\/\/|www\.)/i, score: 35 },
  { rule: "repeat_chars", test: /(.)\1{5,}/, score: 25 },
  { rule: "toxic_like", test: /\b(die|hate|kill|stupid)\b/i, score: 80 },
  { rule: "unicode_obfuscation", test: /[\u200B-\u200D\u2060]/, score: 20 },
];

export async function runModeration(input: {
  channelId: string;
  viewerId: string;
  message: string;
}): Promise<ModerationResult> {
  const matched: string[] = [];
  let riskScore = 0;
  const message = (input.message || "").trim();

  for (const rule of riskyPatterns) {
    if (rule.test.test(message)) {
      matched.push(rule.rule);
      riskScore += rule.score;
    }
  }
  if (message.length > 400) {
    matched.push("very_long");
    riskScore += 10;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("i am the mod") || normalized.includes("system prompt")) {
    matched.push("prompt_injection_hint");
    riskScore += 70;
  }

  const external = process.env.MODERATION_WEBHOOK_URL;
  if (external && riskScore < 65) {
    try {
      const decision = await axios.post(
        external,
        { channelId: input.channelId, viewerId: input.viewerId, message },
        { timeout: 3000, headers: { "content-type": "application/json" } }
      );
      if (decision.data?.riskScore != null) {
        riskScore += Math.max(0, Number(decision.data.riskScore) || 0);
        if (Array.isArray(decision.data.matchedRules)) {
          matched.push(...decision.data.matchedRules);
        }
      }
    } catch {
      // keep local decision if external service fails
    }
  }

  if (riskScore >= 85) {
    return {
      decision: "reject",
      riskScore,
      matchedRules: matched,
      reason: "unsafe_or_toxic",
      policyVersion: POLICY_VERSION,
      cooldownMs: 0,
    };
  }

  if (riskScore >= 55) {
    return {
      decision: "cooldown",
      riskScore,
      matchedRules: matched,
      reason: "suspicious_content_or_flood_patterns",
      policyVersion: POLICY_VERSION,
      cooldownMs: 5000,
    };
  }

  return {
    decision: "allow",
    riskScore,
    matchedRules: matched,
    reason: "",
    policyVersion: POLICY_VERSION,
    cooldownMs: 0,
  };
}
