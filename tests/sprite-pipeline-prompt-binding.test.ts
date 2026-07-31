import assert from "node:assert/strict";
import test from "node:test";
import { hashCanonical, validatePromptBinding, type PromptBinding } from "../lib/sprite-pipeline/prompt-binding";
import type { ActionGrammar, CharacterBible } from "../lib/sprite-pipeline/bibles";

const bible: CharacterBible = {
  bibleId: "char-clay-captain", version: 1, locked: true, originalName: "Clay Captain", role: "fighter", archetype: "tactician",
  ageBand: "adult", heightClass: "tall", proportions: "broad shoulders, short legs", massDistribution: "upper-body heavy", mobility: "bipedal",
  stance: "southpaw crouch", head: "square clay head", facialGeometry: "wide jaw and narrow chin", eyes: "small amber bead eyes", nose: "flattened wedge",
  mouth: "off-center smirk", ears: "small round ears", hair: "three swept clay ridges", wardrobeGeometry: "asymmetric padded jacket", footwear: "oversized clay boots",
  accessories: ["left shoulder badge"], handedness: "left", paletteHex: ["#A14B32", "#203040", "#F0C080"], clayMaterial: "fingerprinted matte plasticine",
  silhouetteAnchors: ["square head", "single high shoulder pad"], asymmetry: ["left shoulder pad only"], personality: ["calm", "calculating"], fightingGimmick: "redirects momentum",
  vocabularies: { entrance: ["measured step"], idle: ["shoulder roll"], attack: ["left cross"], defense: ["forearm redirect"], reaction: ["jaw recoil"], victory: ["single salute"], defeat: ["kneeling slump"] },
  prohibitedDrift: ["no symmetrical shoulder pads"], originalityDeclaration: "Original fictional clay character with no real-person basis.", prohibitedLikenessNotes: ["do not resemble identifiable celebrities"]
};

const grammar: ActionGrammar = {
  grammarId: "left-cross", version: 1, action: "punch", requiredPhases: ["anticipation", "contact", "follow-through", "recovery"], optionalPhases: ["settle"],
  illegalOrders: [["recovery", "contact"]], contactPhase: "contact", recoveryPhase: "recovery", directions: ["left", "right"], minFrames: 4, maxFrames: 12
};

function binding(): PromptBinding {
  return {
    promptId: "prompt-00001", version: 1, assetId: "character-00001", promptText: "Render the locked Clay Captain left-cross contact frame.",
    negativePrompt: "text, logo, watermark, real-person likeness, cast shadow", provider: "provider", model: "image-model", modelVersion: "1",
    parameters: { width: 1024, height: 1024 }, bibleKind: "character", bibleId: bible.bibleId, bibleVersion: bible.version,
    bibleHash: hashCanonical(bible), grammarId: grammar.grammarId, grammarVersion: grammar.version, grammarHash: hashCanonical(grammar)
  };
}

test("accepts a prompt bound to exact locked bible and grammar content", () => {
  const result = validatePromptBinding(binding(), bible, grammar);
  assert.equal(result.passed, true, result.issues.map((issue) => issue.message).join("\n"));
  assert.match(result.promptHash, /^[0-9a-f]{64}$/);
});

test("rejects stale bible hashes after any character drift", () => {
  const changed = { ...bible, hair: "four swept clay ridges" };
  const result = validatePromptBinding(binding(), changed, grammar);
  assert.equal(result.passed, false);
  assert.match(result.issues.map((issue) => issue.controlId).join("\n"), /PROMPT-BIBLE-HASH/);
});

test("rejects unlocked bibles and incomplete grammar references", () => {
  const unlocked = { ...bible, locked: false };
  const value = binding();
  value.grammarHash = undefined;
  const result = validatePromptBinding(value, unlocked);
  assert.equal(result.passed, false);
  const controls = result.issues.map((issue) => issue.controlId).join("\n");
  assert.match(controls, /PROMPT-BIBLE-LOCK/);
  assert.match(controls, /PROMPT-GRAMMAR-FIELDS/);
});
