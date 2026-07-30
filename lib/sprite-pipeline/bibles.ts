export type ValidationIssue = { controlId: string; message: string };

export type CharacterBible = {
  bibleId: string;
  version: number;
  locked: boolean;
  originalName: string;
  role: string;
  archetype: string;
  ageBand: string;
  heightClass: string;
  proportions: string;
  massDistribution: string;
  mobility: string;
  stance: string;
  head: string;
  facialGeometry: string;
  eyes: string;
  nose: string;
  mouth: string;
  ears: string;
  hair: string;
  wardrobeGeometry: string;
  footwear: string;
  accessories: string[];
  handedness: "left" | "right" | "ambidextrous";
  paletteHex: string[];
  clayMaterial: string;
  silhouetteAnchors: string[];
  asymmetry: string[];
  personality: string[];
  fightingGimmick: string;
  vocabularies: Record<"entrance" | "idle" | "attack" | "defense" | "reaction" | "victory" | "defeat", string[]>;
  prohibitedDrift: string[];
  originalityDeclaration: string;
  prohibitedLikenessNotes: string[];
};

export type FxBible = {
  bibleId: string;
  version: number;
  locked: boolean;
  name: string;
  intendedUse: string;
  shapeGrammar: string[];
  phaseGrammar: string[];
  paletteHex: string[];
  opacityRange: [number, number];
  alphaMode: "straight" | "premultiplied";
  premultiplied: boolean;
  edgeSoftness: number;
  emission: number;
  blendMode: "normal" | "add" | "screen" | "multiply";
  pivot: [number, number];
  safeCrop: number;
  scaleRange: [number, number];
  motion: string[];
  contactBehavior: string;
  destructionBehavior: string;
  compositingLayer: string;
  sequenceTiming: string;
  tilingMaterialRules: string[];
  prohibitedDrift: string[];
  originalityDeclaration: string;
};

export type ActionGrammar = {
  grammarId: string;
  version: number;
  action: string;
  requiredPhases: string[];
  optionalPhases: string[];
  illegalOrders: Array<[string, string]>;
  contactPhase?: string;
  recoveryPhase?: string;
  directions: string[];
  minFrames: number;
  maxFrames: number;
};

const HEX = /^#[0-9a-f]{6}$/i;
const FORBIDDEN_CHROMA = "#00ff00";

function requiredText(value: string, controlId: string, label: string, issues: ValidationIssue[]): void {
  if (!value.trim()) issues.push({ controlId, message: `${label} is required` });
}

function validatePalette(values: string[], controlId: string, issues: ValidationIssue[]): void {
  if (values.length === 0) issues.push({ controlId, message: "palette must not be empty" });
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.toLowerCase();
    if (!HEX.test(raw)) issues.push({ controlId, message: `invalid color ${raw}` });
    if (value === FORBIDDEN_CHROMA) issues.push({ controlId, message: "palette conflicts with required chroma #00FF00" });
    if (seen.has(value)) issues.push({ controlId, message: `duplicate palette color ${raw}` });
    seen.add(value);
  }
}

export function validateCharacterBible(bible: CharacterBible): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  requiredText(bible.bibleId, "BIBLE-ID", "bibleId", issues);
  if (!Number.isInteger(bible.version) || bible.version < 1) issues.push({ controlId: "BIBLE-VERSION", message: "version must be a positive integer" });
  if (!bible.locked) issues.push({ controlId: "BIBLE-LOCK", message: "recurring character bible must be locked" });
  for (const [label, value] of Object.entries({ originalName: bible.originalName, role: bible.role, archetype: bible.archetype, ageBand: bible.ageBand, heightClass: bible.heightClass, proportions: bible.proportions, massDistribution: bible.massDistribution, mobility: bible.mobility, stance: bible.stance, head: bible.head, facialGeometry: bible.facialGeometry, eyes: bible.eyes, nose: bible.nose, mouth: bible.mouth, ears: bible.ears, hair: bible.hair, wardrobeGeometry: bible.wardrobeGeometry, footwear: bible.footwear, clayMaterial: bible.clayMaterial, fightingGimmick: bible.fightingGimmick, originalityDeclaration: bible.originalityDeclaration })) {
    requiredText(value, "BIBLE-REQUIRED", label, issues);
  }
  validatePalette(bible.paletteHex, "BIBLE-PALETTE", issues);
  if (bible.silhouetteAnchors.length < 2) issues.push({ controlId: "BIBLE-SILHOUETTE", message: "at least two silhouette anchors are required" });
  if (bible.prohibitedLikenessNotes.length === 0) issues.push({ controlId: "BIBLE-IP", message: "prohibited likeness notes are required" });
  for (const [name, vocabulary] of Object.entries(bible.vocabularies)) {
    if (vocabulary.length === 0) issues.push({ controlId: "BIBLE-VOCAB", message: `${name} vocabulary must not be empty` });
  }
  return issues;
}

export function validateFxBible(bible: FxBible): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  requiredText(bible.bibleId, "FX-BIBLE-ID", "bibleId", issues);
  requiredText(bible.name, "FX-BIBLE-NAME", "name", issues);
  requiredText(bible.intendedUse, "FX-BIBLE-USE", "intendedUse", issues);
  requiredText(bible.originalityDeclaration, "FX-BIBLE-ORIGINALITY", "originalityDeclaration", issues);
  if (!Number.isInteger(bible.version) || bible.version < 1) issues.push({ controlId: "FX-BIBLE-VERSION", message: "version must be a positive integer" });
  if (!bible.locked) issues.push({ controlId: "FX-BIBLE-LOCK", message: "recurring FX bible must be locked" });
  if (bible.shapeGrammar.length === 0 || bible.phaseGrammar.length === 0) issues.push({ controlId: "FX-BIBLE-GRAMMAR", message: "shape and phase grammars are required" });
  validatePalette(bible.paletteHex, "FX-BIBLE-PALETTE", issues);
  const [minOpacity, maxOpacity] = bible.opacityRange;
  if (minOpacity < 0 || maxOpacity > 1 || minOpacity > maxOpacity) issues.push({ controlId: "FX-BIBLE-OPACITY", message: "opacity range must be ordered within 0..1" });
  if (bible.alphaMode === "premultiplied" !== bible.premultiplied) issues.push({ controlId: "FX-BIBLE-PREMULT", message: "alphaMode and premultiplied flag disagree" });
  if (bible.pivot.some((value) => value < 0 || value > 1)) issues.push({ controlId: "FX-BIBLE-PIVOT", message: "pivot coordinates must be normalized" });
  return issues;
}

export function validateActionGrammar(grammar: ActionGrammar): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  requiredText(grammar.grammarId, "GRAMMAR-ID", "grammarId", issues);
  requiredText(grammar.action, "GRAMMAR-ACTION", "action", issues);
  if (!Number.isInteger(grammar.version) || grammar.version < 1) issues.push({ controlId: "GRAMMAR-VERSION", message: "version must be a positive integer" });
  if (grammar.requiredPhases.length === 0) issues.push({ controlId: "GRAMMAR-PHASES", message: "required phases must not be empty" });
  const phases = [...grammar.requiredPhases, ...grammar.optionalPhases];
  if (new Set(phases).size !== phases.length) issues.push({ controlId: "GRAMMAR-DUPLICATE", message: "phase names must be unique" });
  if (!Number.isInteger(grammar.minFrames) || !Number.isInteger(grammar.maxFrames) || grammar.minFrames < 1 || grammar.minFrames > grammar.maxFrames) issues.push({ controlId: "GRAMMAR-FRAMES", message: "frame range is invalid" });
  if (grammar.directions.length === 0) issues.push({ controlId: "GRAMMAR-DIRECTION", message: "at least one direction is required" });
  for (const [before, after] of grammar.illegalOrders) {
    if (!phases.includes(before) || !phases.includes(after)) issues.push({ controlId: "GRAMMAR-ORDER", message: `illegal-order pair references unknown phase ${before}/${after}` });
  }
  if (grammar.contactPhase && !phases.includes(grammar.contactPhase)) issues.push({ controlId: "GRAMMAR-CONTACT", message: "contact phase is not declared" });
  if (grammar.recoveryPhase && !phases.includes(grammar.recoveryPhase)) issues.push({ controlId: "GRAMMAR-RECOVERY", message: "recovery phase is not declared" });
  return issues;
}

export function validatePhaseSequence(grammar: ActionGrammar, phases: string[]): ValidationIssue[] {
  const issues = validateActionGrammar(grammar);
  if (phases.length < grammar.minFrames || phases.length > grammar.maxFrames) issues.push({ controlId: "SEQUENCE-FRAME-COUNT", message: "sequence frame count falls outside grammar range" });
  for (const required of grammar.requiredPhases) if (!phases.includes(required)) issues.push({ controlId: "SEQUENCE-MISSING-PHASE", message: `missing required phase ${required}` });
  for (const phase of phases) if (![...grammar.requiredPhases, ...grammar.optionalPhases].includes(phase)) issues.push({ controlId: "SEQUENCE-UNKNOWN-PHASE", message: `unknown phase ${phase}` });
  for (const [before, after] of grammar.illegalOrders) {
    const beforeIndex = phases.indexOf(before);
    const afterIndex = phases.indexOf(after);
    if (beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex) issues.push({ controlId: "SEQUENCE-ILLEGAL-ORDER", message: `${before} may not precede ${after}` });
  }
  return issues;
}
