export const AUTOTUBE_STANDARD_VERSION = "4.0.0";

export type AspectRatio = "landscape" | "vertical" | "square";
export type VideoIntent =
  | "cold-outreach"
  | "follow-up"
  | "product-demo"
  | "explainer"
  | "brand-film"
  | "social-ad"
  | "case-study"
  | "proposal"
  | "tutorial"
  | "story"
  | "music-visual"
  | "internal-update";

export type AutoTubeStyleId =
  | "evidence-business-demo"
  | "product-ui-demo"
  | "animated-explainer"
  | "cinematic-brand-film"
  | "kinetic-typography"
  | "character-story"
  | "social-performance-ad"
  | "documentary-case-study"
  | "before-after-transformation"
  | "data-story"
  | "mixed-media-collage"
  | "music-driven-visualizer"
  | "custom";

export type BusinessModel =
  | "local-service"
  | "professional-service"
  | "ecommerce"
  | "retail"
  | "saas"
  | "agency"
  | "healthcare"
  | "financial-service"
  | "nonprofit"
  | "hospitality"
  | "creator"
  | "other";

export type RiskProfile = "standard" | "regulated" | "sensitive";
export type ClaimKind = "observed" | "proposed" | "measured" | "creative";
export type FunnelStage =
  | "awareness"
  | "inquiry"
  | "qualification"
  | "conversion"
  | "delivery"
  | "retention"
  | "referral";

export type SceneKind =
  | "hook"
  | "current-state"
  | "problem"
  | "website"
  | "intake"
  | "qualification"
  | "workflow"
  | "product"
  | "scheduling"
  | "follow-up"
  | "handoff"
  | "dashboard"
  | "integration"
  | "character"
  | "environment"
  | "data"
  | "testimonial"
  | "before"
  | "after"
  | "outcome"
  | "offer"
  | "cta"
  | "transition";

export type VisualMode =
  | "website-capture"
  | "live-ui"
  | "workflow-diagram"
  | "dashboard"
  | "message-thread"
  | "calendar"
  | "document-view"
  | "product-view"
  | "character-animation"
  | "cinematic-scene"
  | "kinetic-type"
  | "chart-animation"
  | "before-after"
  | "photo-collage"
  | "abstract-motion"
  | "music-reactive"
  | "brand-transition";

export type AnimationPreset =
  | "none"
  | "fade"
  | "slide"
  | "scale"
  | "spring"
  | "reveal"
  | "mask-wipe"
  | "typewriter"
  | "word-pop"
  | "letter-build"
  | "counter"
  | "draw-path"
  | "cursor-demo"
  | "tap-demo"
  | "scroll-demo"
  | "parallax"
  | "orbit"
  | "float"
  | "pulse"
  | "glitch"
  | "morph"
  | "lip-sync"
  | "character-action"
  | "camera-pan"
  | "camera-push"
  | "camera-pull"
  | "camera-orbit"
  | "music-reactive";

export type TransitionPreset =
  | "cut"
  | "crossfade"
  | "dip-to-color"
  | "whip-pan"
  | "zoom-through"
  | "match-cut"
  | "mask-wipe"
  | "morph"
  | "glitch"
  | "page-turn"
  | "light-leak"
  | "film-burn";

export type EasingPreset =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring-soft"
  | "spring-snappy"
  | "overshoot";

export type AnimationTarget =
  | "scene"
  | "background"
  | "headline"
  | "body"
  | "caption"
  | "image"
  | "video"
  | "character"
  | "cursor"
  | "chart"
  | "particle-layer"
  | "custom";

export type KeyframeValue = number | string | boolean;

export type AnimationKeyframe = {
  at: number;
  values: Record<string, KeyframeValue>;
};

export type AnimationTrack = {
  id: string;
  target: AnimationTarget;
  preset: AnimationPreset;
  startSeconds: number;
  durationSeconds: number;
  easing?: EasingPreset;
  delaySeconds?: number;
  repeat?: number | "infinite";
  keyframes?: AnimationKeyframe[];
  parameters?: Record<string, string | number | boolean>;
};

export type CharacterAction = {
  characterId: string;
  action:
    | "enter"
    | "exit"
    | "walk"
    | "run"
    | "sit"
    | "stand"
    | "gesture"
    | "point"
    | "talk"
    | "react"
    | "use-device"
    | "custom";
  startSeconds: number;
  durationSeconds: number;
  direction?: "left" | "right" | "forward" | "backward";
  intensity?: number;
  prompt?: string;
};

export type CameraMove = {
  preset: Extract<
    AnimationPreset,
    "camera-pan" | "camera-push" | "camera-pull" | "camera-orbit" | "parallax"
  >;
  startSeconds: number;
  durationSeconds: number;
  intensity?: number;
  focusTarget?: string;
};

export type AudioCue = {
  id: string;
  type: "narration" | "music" | "sfx" | "ambient";
  startSeconds: number;
  durationSeconds?: number;
  url?: string;
  text?: string;
  volume?: number;
  duckUnderNarration?: boolean;
  beatSync?: boolean;
};

export type BusinessProfile = {
  name: string;
  website?: string;
  industry?: string;
  businessModel?: BusinessModel;
  riskProfile?: RiskProfile;
  location?: string;
  audience?: string;
  services?: string[];
  differentiators?: string[];
  approvedTerms?: string[];
  prohibitedClaims?: string[];
};

export type EvidenceRecord = {
  id: string;
  sourceUrl: string;
  observedFact: string;
  capturedAt: string;
  confidence?: "high" | "medium" | "low";
};

export type OpportunitySignal = {
  id: string;
  funnelStage: FunnelStage;
  problem: string;
  businessImpact: string;
  evidenceIds: string[];
  severity: "low" | "medium" | "high";
};

export type VideoClaim = {
  text: string;
  kind: ClaimKind;
  evidenceIds?: string[];
};

export type SceneVisual = {
  mode: VisualMode;
  uniqueKey: string;
  assetUrl?: string;
  videoUrl?: string;
  prompt?: string;
  interactionSteps?: string[];
  layout?: string;
  layers?: Array<{
    id: string;
    type: "image" | "video" | "text" | "shape" | "character" | "particle" | "chart" | "ui";
    source?: string;
    prompt?: string;
    zIndex?: number;
  }>;
};

export type AutoTubeScene = {
  id: string;
  kind: SceneKind;
  title: string;
  onScreenText: string;
  narration?: string;
  durationSeconds?: number;
  visual: SceneVisual;
  animations?: AnimationTrack[];
  camera?: CameraMove[];
  characterActions?: CharacterAction[];
  audio?: AudioCue[];
  transitionOut?: TransitionPreset;
  claims?: VideoClaim[];
};

export type StyleOverrides = {
  animationDensity?: "minimal" | "balanced" | "high" | "maximal";
  pacing?: "slow" | "measured" | "fast" | "hyper";
  typography?: "editorial" | "corporate" | "cinematic" | "playful" | "technical" | "bold";
  realism?: "abstract" | "stylized" | "hybrid" | "photoreal";
  colorTreatment?: "brand" | "high-contrast" | "cinematic" | "pastel" | "monochrome" | "neon";
  transitionFamily?: TransitionPreset[];
};

export type AutoTubeVideoPlan = {
  standardVersion?: string;
  title: string;
  intent: VideoIntent;
  styleId: AutoTubeStyleId;
  styleOverrides?: StyleOverrides;
  business?: BusinessProfile;
  opportunitySignals?: OpportunitySignal[];
  offer?: string;
  painPoint?: string;
  callToAction?: string;
  aspectRatio: AspectRatio;
  targetDurationSeconds?: number;
  brandColors?: [string, string];
  captions: boolean;
  evidence?: EvidenceRecord[];
  scenes: AutoTubeScene[];
  globalAudio?: AudioCue[];
};

export type QualityIssue = {
  code: string;
  severity: "blocker" | "warning";
  message: string;
  sceneIndex?: number;
};

export type QualityCategory =
  | "structure"
  | "styleAdherence"
  | "animation"
  | "visualDiversity"
  | "pacing"
  | "readability"
  | "credibility"
  | "audio"
  | "callToAction";

export type AutoTubeQualityReport = {
  standardVersion: string;
  score: number;
  threshold: number;
  publishable: boolean;
  totalDurationSeconds: number;
  categoryScores: Record<QualityCategory, number>;
  issues: QualityIssue[];
};
