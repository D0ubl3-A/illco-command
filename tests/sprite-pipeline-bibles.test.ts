import assert from "node:assert/strict";
import test from "node:test";
import {
  validateActionGrammar,
  validateCharacterBible,
  validateFxBible,
  validatePhaseSequence,
  type ActionGrammar,
  type CharacterBible,
  type FxBible,
} from "../lib/sprite-pipeline/bibles";

function characterBible(): CharacterBible {
  return {
    bibleId: "character-bible-00001",
    version: 1,
    locked: true,
    originalName: "Mallet Mayor",
    role: "fictional arena challenger",
    archetype: "boastful civic bruiser",
    ageBand: "middle-aged",
    heightClass: "tall",
    proportions: "broad shoulders, short legs",
    massDistribution: "upper-body heavy",
    mobility: "independent bipedal",
    stance: "wide orthodox",
    head: "rounded clay block",
    facialGeometry: "triangular brows and broad chin",
    eyes: "small oval",
    nose: "short wedge",
    mouth: "wide asymmetric smirk",
    ears: "small round",
    hair: "single swept clay ridge",
    wardrobeGeometry: "double-breasted fictional ceremonial jacket",
    footwear: "oversized clay boots",
    accessories: ["foam ceremonial key"],
    handedness: "right",
    paletteHex: ["#9A3F2C", "#264C73", "#E2B879"],
    clayMaterial: "fingerprinted matte polymer clay",
    silhouetteAnchors: ["high squared shoulders", "key-shaped forearm prop"],
    asymmetry: ["right-side prop", "left lapel fold"],
    personality: ["grandiose", "easily startled"],
    fightingGimmick: "misuses a ceremonial foam key as a clumsy lever",
    vocabularies: {
      entrance: ["waves key overhead"],
      idle: ["checks imaginary crowd approval"],
      attack: ["overhand foam-key chop"],
      defense: ["hides behind oversized lapels"],
      reaction: ["jaw drops and shoulders collapse"],
      victory: ["plants key like a flag"],
      defeat: ["key bends while character sits stunned"],
    },
    prohibitedDrift: ["no realistic skin", "no branded wardrobe"],
    originalityDeclaration: "Entirely fictional clay character with no intended real-person identity.",
    prohibitedLikenessNotes: ["Do not reproduce any real politician, actor, athlete, or public figure."],
  };
}

function fxBible(): FxBible {
  return {
    bibleId: "fx-bible-00001",
    version: 1,
    locked: true,
    name: "Clay Impact Star",
    intendedUse: "cartoon contact emphasis",
    shapeGrammar: ["six uneven clay spikes", "compressed center disc"],
    phaseGrammar: ["pinch", "burst", "stretch", "crumb-fall"],
    paletteHex: ["#FFD43B", "#FF7A18"],
    opacityRange: [0.5, 1],
    alphaMode: "straight",
    premultiplied: false,
    edgeSoftness: 0.15,
    emission: 0.2,
    blendMode: "normal",
    pivot: [0.5, 0.5],
    safeCrop: 0.08,
    scaleRange: [0.5, 2],
    motion: ["radial expansion", "downward crumbs"],
    contactBehavior: "center aligns to collision point",
    destructionBehavior: "spikes fragment into clay crumbs",
    compositingLayer: "foreground-contact",
    sequenceTiming: "6 frames at 24 fps",
    tilingMaterialRules: ["not tileable"],
    prohibitedDrift: ["no text", "no logos"],
    originalityDeclaration: "Original generic clay impact graphic.",
  };
}

const grammar: ActionGrammar = {
  grammarId: "grammar-punch-jab-v1",
  version: 1,
  action: "jab",
  requiredPhases: ["anticipation", "extension", "contact", "recovery"],
  optionalPhases: ["settle"],
  illegalOrders: [["recovery", "contact"]],
  contactPhase: "contact",
  recoveryPhase: "recovery",
  directions: ["left", "right"],
  minFrames: 4,
  maxFrames: 8,
};

test("accepts a complete locked fictional character bible", () => {
  assert.deepEqual(validateCharacterBible(characterBible()), []);
});

test("rejects unlocked bibles and chroma-conflicting wardrobe palettes", () => {
  const value = characterBible();
  value.locked = false;
  value.paletteHex.push("#00FF00");
  const issues = validateCharacterBible(value);
  assert.match(issues.map((issue) => issue.message).join("\n"), /must be locked/i);
  assert.match(issues.map((issue) => issue.message).join("\n"), /conflicts with required chroma/i);
});

test("accepts a complete FX bible with consistent alpha semantics", () => {
  assert.deepEqual(validateFxBible(fxBible()), []);
});

test("rejects contradictory premultiplication declarations", () => {
  const value = fxBible();
  value.alphaMode = "premultiplied";
  const issues = validateFxBible(value);
  assert.match(issues.map((issue) => issue.message).join("\n"), /premultiplied flag disagree/i);
});

test("rejects non-positive, non-finite, and reversed FX scale ranges", () => {
  for (const scaleRange of [[0, 1], [2, 1], [0.5, Number.POSITIVE_INFINITY]] as Array<[number, number]>) {
    const value = fxBible();
    value.scaleRange = scaleRange;
    const issues = validateFxBible(value);
    assert.equal(issues.some((issue) => issue.controlId === "FX-BIBLE-SCALE"), true);
  }
});

test("accepts a valid punch phase sequence", () => {
  assert.deepEqual(validateActionGrammar(grammar), []);
  assert.deepEqual(validatePhaseSequence(grammar, ["anticipation", "extension", "contact", "recovery"]), []);
});

test("rejects missing phases illegal order and unknown phase", () => {
  const issues = validatePhaseSequence(grammar, ["anticipation", "recovery", "contact", "teleport"]);
  const text = issues.map((issue) => issue.message).join("\n");
  assert.match(text, /missing required phase extension/i);
  assert.match(text, /unknown phase teleport/i);
  assert.match(text, /recovery may not precede contact/i);
});
