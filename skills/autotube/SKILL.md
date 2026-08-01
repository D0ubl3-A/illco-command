---
name: autotube
version: 4.0.0
description: Plan, produce, animate, validate, render, and package high-quality videos across multiple deeply tuned styles. Use for business demos, product UI demos, animated explainers, cinematic brand films, kinetic typography, character stories, social ads, documentary case studies, before-and-after transformations, data stories, mixed-media collage, music-driven visualizers, and explicit custom styles.
---

# AutoTube 4.0

AutoTube is a universal video-production system. It is not a slideshow generator and it is not limited to business outreach.

The core system separates:

1. **Intent** — what the video must accomplish.
2. **Style** — the creative and production language.
3. **Truth and rights** — what may be claimed and shown.
4. **Narrative** — how the viewer changes from opening to ending.
5. **Assets** — what must be captured, generated, licensed, or supplied.
6. **Animation** — how motion communicates meaning, action, emotion, or rhythm.
7. **Audio** — narration, dialogue, music, sound effects, ambience, and silence.
8. **Render** — deterministic composition and export.
9. **Quality** — style-aware scoring and blocker enforcement.
10. **Learning** — performance and review evidence that improves future production.

## Primary modules

- `lib/chatgpt-apps/autotube/types.ts`
- `lib/chatgpt-apps/autotube/styles.ts`
- `lib/chatgpt-apps/autotube/style-directives.ts`
- `lib/chatgpt-apps/autotube/pipeline.ts`
- `lib/chatgpt-apps/autotube/master-prompts.ts`
- `lib/chatgpt-apps/autotube/quality.ts`

## Available styles

### Evidence Business Demo

Use for prospect-specific outreach, business proposals, workflow demonstrations, and evidence-backed follow-up.

This is one style among many. It requires current public evidence, visible workflow actions, honest labeling of proposed concepts, and a concrete pilot or walkthrough CTA.

### Product UI Demo

Use when the interface and its state changes are the central proof. Show one complete user job from entry through result.

### Animated Explainer

Use when abstract ideas need characters, diagrams, icons, shapes, metaphors, and causal animation.

### Cinematic Brand Film

Use when emotion, atmosphere, human stakes, product craft, environment, camera, and sound should carry the message.

### Kinetic Typography

Use when language, rhythm, hierarchy, spacing, and typographic motion are the primary visual medium.

### Character Story

Use when recurring characters, action, reaction, dialogue, environment, and emotional change should drive the video.

### Social Performance Ad

Use for fast direct-response videos requiring a strong first frame, visible mechanism, proof, specific offer, and one low-friction CTA.

### Documentary Case Study

Use for real transformation stories with consent, evidence, interviews, process footage, dated metrics, context, and limitations.

### Before-and-After Transformation

Use when matched framing and fair comparison can make a change visually undeniable.

### Data Story

Use when charts, comparisons, timelines, sources, uncertainty, and implications are the central narrative.

### Mixed-Media Collage

Use for layered editorial compositions combining photography, screenshots, illustration, paper texture, type, and rapid motion.

### Music-Driven Visualizer

Use when motion, cuts, typography, color, particles, characters, and camera should follow the structure, rhythm, lyrics, and emotional arc of music.

### Custom

Use only when a complete custom style constitution is defined. Custom never means generic or unconstrained.

## Required workflow

### 1. Lock the brief

Determine:

- audience
- intent
- platform
- aspect ratio
- target duration
- desired viewer action or ending state
- constraints
- approvals
- prohibited content

Do not begin asset generation before the video has one primary job.

### 2. Choose the style

Select the style whose production discipline best serves the request. Do not select based on surface appearance alone.

Use `getAutoTubeStyle(styleId)` and `getStyleDirective(styleId)`.

When more than one style is useful, choose one primary style and define secondary influences in `styleOverrides`. Do not mix style grammars casually.

### 3. Verify truth, evidence, and rights

Classify every material statement as:

- observed
- proposed
- measured
- creative

Observed and measured claims require evidence IDs.

Verify the rights and allowed use of:

- logos
- trademarks
- likenesses
- voices
- testimonials
- music
- lyrics
- fonts
- stock media
- user-supplied media
- generated media

Never place private, confidential, regulated, or personally identifying information into sample scenes.

### 4. Build the production pipeline

Call:

```ts
const pipeline = buildAutoTubePipeline(plan);
```

Execute the stages in order. A failed blocking gate prevents advancement.

The standard stages are:

1. brief
2. truth and rights
3. style constitution
4. story architecture
5. asset production
6. animation choreography
7. audio production
8. assembly
9. automated quality
10. human review
11. platform variants
12. delivery and learning

### 5. Compile the master prompt

Call:

```ts
const prompt = buildAutoTubeMasterPrompt(plan, {
  requireResearch: true,
  requireImageGeneration: true,
  requireAnimation: true,
  requireAudio: true,
  requirePlatformVariants: true,
  critiquePasses: 3,
  outputMode: "render-ready",
});
```

The compiled prompt must contain:

- project brief
- selected style doctrine
- quantitative style targets
- forbidden patterns
- evidence and claim rules
- style-specific director bible
- complete production pipeline
- asset-generation requirements
- animation requirements
- audio requirements
- adversarial critique loop
- scoring rubric
- structured output contract

### 6. Create render-ready scenes

Every scene requires:

- unique ID
- purpose
- scene kind
- duration
- visual mode
- unique visual key
- narration or dialogue when applicable
- concise on-screen text
- layers
- animation tracks
- camera moves when applicable
- character actions when applicable
- audio cues
- transition
- claims and evidence IDs
- disclosure or risk notes when applicable

Animations must define:

- target
- preset or keyframes
- start time
- duration
- easing
- delay
- repeat behavior
- parameters
- semantic purpose

Do not use the same entrance preset for every object.

### 7. Run the quality gate

Call:

```ts
const report = scoreAutoTubeVideoPlan(plan);
```

The score totals 100 points:

- structure: 10
- style adherence: 15
- animation: 15
- visual diversity: 10
- pacing: 10
- readability: 10
- credibility: 10
- audio: 10
- CTA or emotional resolution: 10

Publication requires:

- score of at least 85
- zero blockers

Use:

```ts
assertAutoTubeVideoPublishable(plan);
```

Never bypass a blocker because the aggregate score is high.

## Universal non-negotiables

1. Never call a static slide sequence a demonstration when the promised action could be shown.
2. Never repeat one decorative background across the complete video.
3. Never claim a mockup, concept, simulation, or proposed workflow is live.
4. Never invent metrics, testimonials, compliance, security, integrations, customers, or results.
5. Never render recurring characters, products, interfaces, or environments without continuity references.
6. Never perform lip sync before dialogue timing is locked.
7. Never animate all objects with one default preset.
8. Never use music-driven visuals without a time-coded song structure map.
9. Never use data visuals without sources, units, dates, denominators, and fair scales where relevant.
10. Never use before-and-after comparisons with misleadingly different conditions.
11. Never say a render started unless a real render job, session, or manifest exists.
12. Never say a render completed unless a real verified output exists.

## Animation standard

AutoTube supports:

- object entrances and exits
- kinetic typography
- cursor and tap demonstrations
- scroll demonstrations
- charts and counters
- path drawing
- masks and wipes
- parallax and depth
- camera pans, pushes, pulls, and orbits
- character actions and reactions
- lip sync
- environment motion
- particles
- morphing
- music-reactive animation
- custom keyframes

Motion must perform at least one function:

- explain
- demonstrate
- direct attention
- reveal causality
- express emotion
- establish rhythm
- preserve continuity
- create contrast

Purely decorative motion is secondary.

## Self-critique requirement

Before approval, run at least three passes:

1. audience truth test
2. creative-director and style-adherence test
3. evidence, rights, safety, technical, and subtraction test

For each defect, record:

- severity
- exact correction
- affected manifest entries
- score before
- score after

## Completion standard

A video is complete only when:

- all required assets exist
- manifests are versioned
- audio and captions are synchronized
- quality threshold passes
- blockers are zero
- the exported file or interactive renderer exists
- the output is verified after export
- the delivery package points to the approved version

A beautiful plan is not a finished video. A render shell is not proof. A file that was not watched and verified is not complete.
