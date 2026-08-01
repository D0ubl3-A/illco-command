import type {
  AnimationPreset,
  AutoTubeStyleId,
  SceneKind,
  TransitionPreset,
  VideoIntent,
  VisualMode,
} from "./types";

export type AutoTubeStylePreset = {
  id: AutoTubeStyleId;
  name: string;
  creativeThesis: string;
  bestFor: VideoIntent[];
  sceneGrammar: SceneKind[];
  visualModes: VisualMode[];
  animationLanguage: AnimationPreset[];
  transitionLanguage: TransitionPreset[];
  targetSceneCount: [number, number];
  targetDurationSeconds: [number, number];
  targetVisualChangeSeconds: [number, number];
  minimumAnimationTracksPerScene: number;
  requiresBusinessEvidence: boolean;
  requiresLiveDemonstration: boolean;
  supportsCharacters: boolean;
  supportsBeatSync: boolean;
  forbiddenPatterns: string[];
  proofOfQuality: string[];
};

const sharedForbidden = [
  "repeating one decorative background for the full video",
  "using static text slides to describe actions that could be demonstrated",
  "showing unreadable mobile-sized text",
  "claiming a result that is not observed, measured, or clearly labeled as proposed",
  "ending without a clear final action or intentional emotional resolution",
];

export const AUTOTUBE_STYLES: Record<AutoTubeStyleId, AutoTubeStylePreset> = {
  "evidence-business-demo": {
    id: "evidence-business-demo",
    name: "Evidence Business Demo",
    creativeThesis:
      "Turn a verified business friction into a prospect-specific working demonstration. The viewer should recognize their company immediately and see a believable future workflow rather than hear generic automation claims.",
    bestFor: ["cold-outreach", "follow-up", "proposal", "case-study"],
    sceneGrammar: [
      "hook",
      "current-state",
      "website",
      "intake",
      "qualification",
      "workflow",
      "scheduling",
      "follow-up",
      "handoff",
      "outcome",
      "offer",
      "cta",
    ],
    visualModes: [
      "website-capture",
      "live-ui",
      "message-thread",
      "calendar",
      "dashboard",
      "workflow-diagram",
      "document-view",
    ],
    animationLanguage: ["cursor-demo", "tap-demo", "scroll-demo", "reveal", "counter", "camera-push"],
    transitionLanguage: ["cut", "crossfade", "match-cut", "mask-wipe"],
    targetSceneCount: [8, 14],
    targetDurationSeconds: [45, 90],
    targetVisualChangeSeconds: [3, 6],
    minimumAnimationTracksPerScene: 2,
    requiresBusinessEvidence: true,
    requiresLiveDemonstration: true,
    supportsCharacters: false,
    supportsBeatSync: false,
    forbiddenPatterns: [
      ...sharedForbidden,
      "opening with a generic industry statement before naming the prospect",
      "using invented performance percentages",
      "calling a mockup a completed integration",
      "automating regulated professional judgment",
    ],
    proofOfQuality: [
      "prospect name or unmistakable identity appears in the first three seconds",
      "at least sixty percent of scenes visibly demonstrate workflow actions",
      "every observed claim maps to dated public evidence",
      "the proposed pilot has a concrete scope and next step",
    ],
  },

  "product-ui-demo": {
    id: "product-ui-demo",
    name: "Product UI Demo",
    creativeThesis:
      "Make the interface feel inevitable: every camera move, cursor action, state change, and annotation should reveal how the product works and why the result matters.",
    bestFor: ["product-demo", "tutorial", "social-ad", "proposal"],
    sceneGrammar: ["hook", "product", "workflow", "dashboard", "integration", "outcome", "cta"],
    visualModes: ["live-ui", "website-capture", "dashboard", "workflow-diagram", "document-view"],
    animationLanguage: ["cursor-demo", "tap-demo", "scroll-demo", "mask-wipe", "camera-push", "counter"],
    transitionLanguage: ["cut", "match-cut", "zoom-through", "mask-wipe"],
    targetSceneCount: [6, 14],
    targetDurationSeconds: [30, 120],
    targetVisualChangeSeconds: [2, 5],
    minimumAnimationTracksPerScene: 3,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: true,
    supportsCharacters: false,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "zooming randomly without guiding attention",
      "showing cursor motion that does not cause a visible state change",
      "listing features without demonstrating a complete user outcome",
      "using fake loading states to imply unsupported functionality",
    ],
    proofOfQuality: [
      "each interaction produces a visible consequence",
      "the product is readable at mobile playback size",
      "the viewer sees one complete job from entry to result",
      "annotations explain why a step matters without covering the interface",
    ],
  },

  "animated-explainer": {
    id: "animated-explainer",
    name: "Animated Explainer",
    creativeThesis:
      "Translate an idea into a visual system of characters, shapes, icons, diagrams, and metaphors so the audience understands the concept before the narration finishes explaining it.",
    bestFor: ["explainer", "tutorial", "proposal", "internal-update"],
    sceneGrammar: ["hook", "problem", "character", "workflow", "data", "outcome", "cta"],
    visualModes: ["workflow-diagram", "character-animation", "kinetic-type", "chart-animation", "abstract-motion"],
    animationLanguage: ["draw-path", "morph", "character-action", "word-pop", "spring", "parallax"],
    transitionLanguage: ["morph", "mask-wipe", "page-turn", "crossfade"],
    targetSceneCount: [7, 16],
    targetDurationSeconds: [45, 150],
    targetVisualChangeSeconds: [2, 5],
    minimumAnimationTracksPerScene: 4,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: false,
    supportsCharacters: true,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "animating every object with the same entrance preset",
      "using decorative icons that do not explain causality",
      "changing illustration style or character identity between scenes",
      "letting narration carry concepts that have no visual representation",
    ],
    proofOfQuality: [
      "every abstract idea receives a concrete visual metaphor",
      "character and object designs stay consistent",
      "motion demonstrates cause and effect",
      "scene composition remains understandable with audio muted",
    ],
  },

  "cinematic-brand-film": {
    id: "cinematic-brand-film",
    name: "Cinematic Brand Film",
    creativeThesis:
      "Create desire through atmosphere, human stakes, visual restraint, cinematic continuity, and sound. The film should feel authored, not assembled from disconnected beauty shots.",
    bestFor: ["brand-film", "story", "social-proof", "social-ad"],
    sceneGrammar: ["hook", "environment", "character", "product", "outcome", "cta"],
    visualModes: ["cinematic-scene", "product-view", "character-animation", "abstract-motion"],
    animationLanguage: ["camera-pan", "camera-push", "camera-pull", "camera-orbit", "parallax", "float"],
    transitionLanguage: ["film-burn", "light-leak", "match-cut", "crossfade", "whip-pan"],
    targetSceneCount: [6, 14],
    targetDurationSeconds: [30, 120],
    targetVisualChangeSeconds: [3, 8],
    minimumAnimationTracksPerScene: 2,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: false,
    supportsCharacters: true,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "using cinematic black bars as a substitute for cinematic composition",
      "mixing incompatible lighting, lens language, or color science",
      "overexplaining the brand with dense copy",
      "using stock-style montage without a dramatic progression",
    ],
    proofOfQuality: [
      "shots share a coherent world, lens language, and lighting logic",
      "camera motion has a narrative reason",
      "sound design creates continuity across cuts",
      "the ending resolves the emotional promise established by the opening",
    ],
  },

  "kinetic-typography": {
    id: "kinetic-typography",
    name: "Kinetic Typography",
    creativeThesis:
      "Make language physical. Rhythm, scale, spacing, timing, hierarchy, and letter motion should turn the spoken or written message into a visual performance.",
    bestFor: ["social-ad", "explainer", "music-visual", "internal-update"],
    sceneGrammar: ["hook", "problem", "data", "outcome", "cta"],
    visualModes: ["kinetic-type", "abstract-motion", "photo-collage"],
    animationLanguage: ["word-pop", "letter-build", "typewriter", "glitch", "mask-wipe", "music-reactive"],
    transitionLanguage: ["cut", "glitch", "mask-wipe", "zoom-through"],
    targetSceneCount: [8, 24],
    targetDurationSeconds: [15, 90],
    targetVisualChangeSeconds: [1, 4],
    minimumAnimationTracksPerScene: 4,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: false,
    supportsCharacters: false,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "animating full paragraphs",
      "using more than two primary type families",
      "changing type treatment without a rhetorical reason",
      "sacrificing readability for constant motion",
    ],
    proofOfQuality: [
      "emphasis follows meaning and vocal cadence",
      "the most important phrase is unmistakable in every beat",
      "text remains readable during motion and at mobile size",
      "silence, pauses, and empty space are used intentionally",
    ],
  },

  "character-story": {
    id: "character-story",
    name: "Character Story",
    creativeThesis:
      "Build a coherent narrative around recurring characters whose actions, reactions, goals, and environment changes communicate the message through story rather than explanation.",
    bestFor: ["story", "explainer", "brand-film", "social-ad"],
    sceneGrammar: ["hook", "character", "environment", "problem", "workflow", "outcome", "cta"],
    visualModes: ["character-animation", "cinematic-scene", "product-view"],
    animationLanguage: ["character-action", "lip-sync", "camera-pan", "camera-push", "parallax", "morph"],
    transitionLanguage: ["cut", "match-cut", "crossfade", "whip-pan"],
    targetSceneCount: [8, 20],
    targetDurationSeconds: [45, 180],
    targetVisualChangeSeconds: [2, 7],
    minimumAnimationTracksPerScene: 3,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: false,
    supportsCharacters: true,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "changing a character's face, outfit, proportions, or age without story justification",
      "using lip sync when the audio timing is not locked",
      "making characters pose instead of perform meaningful actions",
      "introducing more characters than the audience can track",
    ],
    proofOfQuality: [
      "each main character has a stable visual identity sheet",
      "actions advance the plot or reveal emotion",
      "screen direction and geography remain coherent",
      "the character ends in a meaningfully different state from the opening",
    ],
  },

  "social-performance-ad": {
    id: "social-performance-ad",
    name: "Social Performance Ad",
    creativeThesis:
      "Win attention immediately, create a sharp problem-solution contrast, demonstrate believable proof, make the offer concrete, and remove friction from the next action.",
    bestFor: ["social-ad", "cold-outreach", "follow-up"],
    sceneGrammar: ["hook", "problem", "product", "data", "outcome", "offer", "cta"],
    visualModes: ["kinetic-type", "product-view", "before-after", "live-ui", "photo-collage"],
    animationLanguage: ["word-pop", "counter", "spring", "tap-demo", "camera-push", "music-reactive"],
    transitionLanguage: ["cut", "zoom-through", "whip-pan", "glitch"],
    targetSceneCount: [8, 20],
    targetDurationSeconds: [10, 60],
    targetVisualChangeSeconds: [1, 3],
    minimumAnimationTracksPerScene: 3,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: false,
    supportsCharacters: true,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "taking more than two seconds to establish the hook",
      "using vague benefits without showing the mechanism",
      "adding urgency that is false or unverifiable",
      "placing multiple competing calls to action in one ad",
    ],
    proofOfQuality: [
      "the first frame communicates tension or desired outcome",
      "the offer is understood without audio",
      "proof appears before the CTA",
      "the final action is singular, specific, and low-friction",
    ],
  },

  "documentary-case-study": {
    id: "documentary-case-study",
    name: "Documentary Case Study",
    creativeThesis:
      "Tell a truthful transformation story using real evidence, human testimony, observed process, measured outcomes, and enough context for the audience to trust the conclusion.",
    bestFor: ["case-study", "social-proof", "brand-film"],
    sceneGrammar: ["hook", "current-state", "testimonial", "workflow", "data", "outcome", "cta"],
    visualModes: ["cinematic-scene", "chart-animation", "document-view", "before-after", "photo-collage"],
    animationLanguage: ["counter", "reveal", "camera-pan", "camera-push", "draw-path"],
    transitionLanguage: ["cut", "crossfade", "match-cut", "dip-to-color"],
    targetSceneCount: [8, 20],
    targetDurationSeconds: [60, 240],
    targetVisualChangeSeconds: [3, 8],
    minimumAnimationTracksPerScene: 2,
    requiresBusinessEvidence: true,
    requiresLiveDemonstration: false,
    supportsCharacters: true,
    supportsBeatSync: false,
    forbiddenPatterns: [
      ...sharedForbidden,
      "presenting a testimonial without attribution or permission",
      "using a before-and-after comparison with mismatched conditions",
      "cherry-picking metrics without timeframe or baseline",
      "recreating events while implying the footage is documentary evidence",
    ],
    proofOfQuality: [
      "every measured result includes a baseline, timeframe, and source",
      "the audience sees the process between problem and result",
      "testimony is contextualized rather than used as decoration",
      "limitations and scope are represented honestly",
    ],
  },

  "before-after-transformation": {
    id: "before-after-transformation",
    name: "Before and After Transformation",
    creativeThesis:
      "Use controlled visual comparison to make change undeniable. Match framing and conditions, reveal the intervention, and connect the transformation to a credible mechanism.",
    bestFor: ["case-study", "social-ad", "product-demo", "social-proof"],
    sceneGrammar: ["hook", "before", "workflow", "after", "data", "outcome", "cta"],
    visualModes: ["before-after", "product-view", "live-ui", "chart-animation"],
    animationLanguage: ["mask-wipe", "morph", "counter", "camera-push", "reveal"],
    transitionLanguage: ["match-cut", "mask-wipe", "morph", "cut"],
    targetSceneCount: [6, 14],
    targetDurationSeconds: [20, 90],
    targetVisualChangeSeconds: [2, 6],
    minimumAnimationTracksPerScene: 2,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: false,
    supportsCharacters: true,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "comparing different angles, lighting, scales, or timeframes without disclosure",
      "showing the result without showing the intervention",
      "using a morph that invents intermediate reality",
      "claiming causation when only correlation is known",
    ],
    proofOfQuality: [
      "before and after states use matched framing",
      "the intervention is visible and understandable",
      "measured claims include conditions and timeframe",
      "the transformation is clear in a single paused frame",
    ],
  },

  "data-story": {
    id: "data-story",
    name: "Data Story",
    creativeThesis:
      "Turn evidence into a narrative: establish the question, reveal patterns progressively, compare only meaningful quantities, and end with an insight the audience can act on.",
    bestFor: ["explainer", "case-study", "proposal", "internal-update"],
    sceneGrammar: ["hook", "data", "problem", "workflow", "outcome", "cta"],
    visualModes: ["chart-animation", "workflow-diagram", "kinetic-type", "dashboard"],
    animationLanguage: ["counter", "draw-path", "reveal", "morph", "camera-push"],
    transitionLanguage: ["morph", "mask-wipe", "crossfade", "cut"],
    targetSceneCount: [6, 16],
    targetDurationSeconds: [30, 150],
    targetVisualChangeSeconds: [2, 6],
    minimumAnimationTracksPerScene: 3,
    requiresBusinessEvidence: true,
    requiresLiveDemonstration: false,
    supportsCharacters: false,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "using 3D charts or decorative chart junk",
      "animating values without labeled units or baselines",
      "changing axis scale between comparisons",
      "revealing all data at once before establishing the question",
    ],
    proofOfQuality: [
      "each chart answers one explicit question",
      "source, unit, timeframe, and denominator are available",
      "animation reveals the reasoning sequence",
      "the final insight is more meaningful than the largest number",
    ],
  },

  "mixed-media-collage": {
    id: "mixed-media-collage",
    name: "Mixed Media Collage",
    creativeThesis:
      "Combine photography, screenshots, illustration, paper texture, type, and editorial rhythm into a deliberately layered composition with one coherent visual world.",
    bestFor: ["brand-film", "social-ad", "story", "music-visual"],
    sceneGrammar: ["hook", "environment", "character", "product", "outcome", "cta"],
    visualModes: ["photo-collage", "kinetic-type", "abstract-motion", "product-view"],
    animationLanguage: ["slide", "scale", "spring", "mask-wipe", "parallax", "glitch"],
    transitionLanguage: ["page-turn", "mask-wipe", "glitch", "cut", "film-burn"],
    targetSceneCount: [8, 24],
    targetDurationSeconds: [15, 120],
    targetVisualChangeSeconds: [1, 4],
    minimumAnimationTracksPerScene: 5,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: false,
    supportsCharacters: true,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "combining unrelated art styles without a unifying texture or palette",
      "using random scrapbook motion with no hierarchy",
      "layering so many assets that the focal point disappears",
      "letting texture reduce text contrast",
    ],
    proofOfQuality: [
      "each frame has one unmistakable focal point",
      "textures, edges, shadows, and color treatment create one world",
      "layer motion creates depth rather than noise",
      "editorial rhythm follows the message or music structure",
    ],
  },

  "music-driven-visualizer": {
    id: "music-driven-visualizer",
    name: "Music Driven Visualizer",
    creativeThesis:
      "Translate musical structure into motion. Cuts, typography, camera energy, particles, color, character action, and visual intensity should respond to beats, sections, lyrics, and emotional changes.",
    bestFor: ["music-visual", "social-ad", "brand-film"],
    sceneGrammar: ["hook", "environment", "character", "transition", "outcome"],
    visualModes: ["music-reactive", "kinetic-type", "abstract-motion", "cinematic-scene"],
    animationLanguage: ["music-reactive", "pulse", "glitch", "camera-orbit", "word-pop", "morph"],
    transitionLanguage: ["cut", "glitch", "zoom-through", "film-burn", "whip-pan"],
    targetSceneCount: [8, 40],
    targetDurationSeconds: [15, 240],
    targetVisualChangeSeconds: [0.5, 4],
    minimumAnimationTracksPerScene: 4,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: false,
    supportsCharacters: true,
    supportsBeatSync: true,
    forbiddenPatterns: [
      ...sharedForbidden,
      "using random equalizer bars as the only music response",
      "cutting every beat with no contrast between song sections",
      "displaying copyrighted lyrics beyond the supplied or licensed scope",
      "ignoring lyrical meaning when visualizing a lyric-driven song",
    ],
    proofOfQuality: [
      "the visual energy map follows the song structure",
      "major transitions land on musically meaningful moments",
      "repetition evolves rather than looping unchanged",
      "lyrics or vocal concepts receive purposeful visual interpretation",
    ],
  },

  custom: {
    id: "custom",
    name: "Custom",
    creativeThesis:
      "A fully authored style whose composition grammar, motion language, pacing, assets, sound, and validation constraints are explicitly supplied by the project.",
    bestFor: [
      "cold-outreach",
      "follow-up",
      "product-demo",
      "explainer",
      "brand-film",
      "social-ad",
      "case-study",
      "proposal",
      "tutorial",
      "story",
      "music-visual",
      "internal-update",
    ],
    sceneGrammar: [],
    visualModes: [],
    animationLanguage: [],
    transitionLanguage: [],
    targetSceneCount: [1, 40],
    targetDurationSeconds: [6, 300],
    targetVisualChangeSeconds: [0.5, 12],
    minimumAnimationTracksPerScene: 0,
    requiresBusinessEvidence: false,
    requiresLiveDemonstration: false,
    supportsCharacters: true,
    supportsBeatSync: true,
    forbiddenPatterns: sharedForbidden,
    proofOfQuality: [
      "the project defines its own explicit visual and motion rules",
      "the final render can be judged against those rules",
      "custom does not mean unconstrained or generic",
    ],
  },
};

export function getAutoTubeStyle(styleId: AutoTubeStyleId) {
  return AUTOTUBE_STYLES[styleId];
}

export function listAutoTubeStyles() {
  return Object.values(AUTOTUBE_STYLES);
}
