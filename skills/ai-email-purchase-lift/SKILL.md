---
name: ai-email-purchase-lift
version: 1.0.0
description: Design, audit, write, test, and scale AI-assisted email programs that increase incremental purchases and gross profit while protecting consent, deliverability, trust, and long-term customer value. Use for lifecycle flows, promotional campaigns, predictive segments, recommendations, send-time optimization, luxury HTML emails, testing plans, platform selection, and conversion-focused outreach.
---

# AI Email Purchase-Lift

This skill treats email marketing as a measurable decision system, not a copywriting contest.

The governing objective is:

> Maximize incremental gross profit per eligible customer while protecting consent, deliverability, customer trust, and long-term value.

Do not optimize primarily for opens. Opens are a noisy diagnostic and can be distorted by privacy features. Prefer purchases, revenue per eligible recipient, gross profit, retention, and downstream customer behavior.

## Core doctrine

1. Triggered relevance beats undifferentiated broadcasting.
2. Different customers respond to different products, offers, timing, language, and frequency.
3. Engagement winners are not automatically purchase or margin winners.
4. AI must generate from approved facts; it must never become the source of truth for price, inventory, eligibility, claims, deadlines, scarcity, or consent.
5. Every material AI capability must be locally validated against a control.
6. Scale only when incremental margin exceeds platform, model, implementation, discount, return, deliverability, and churn costs.
7. Fewer, better-timed, more relevant messages are superior to limitless AI variation.

## Use this skill for

- AI email strategy and implementation roadmaps
- purchase-conversion audits
- welcome, cart, browse, replenishment, post-purchase, upsell, churn, win-back, and repermission flows
- predictive segmentation and next-best-action policies
- product recommendation logic
- subject-line, preheader, body, offer, CTA, timing, and frequency experiments
- luxury or premium HTML email design
- personalized prospecting and sales outreach
- platform comparisons and implementation requirements
- experiment design, holdouts, power planning, and financial evaluation
- compliance, consent, privacy, deliverability, and governance reviews
- AutoTube-assisted video sales emails

## Required input model

Collect or infer, with visible assumptions:

- business model and industry
- audience and customer state
- primary purchase action
- products, services, offers, prices, availability, and approved claims
- current email platform and connected systems
- available customer, event, purchase, catalog, and consent data
- baseline conversion and margin when available
- send volume and eligible audience size
- geography and applicable legal constraints
- brand voice and visual standard
- campaign or lifecycle trigger
- desired measurement horizon

When the request is for a single outbound sales email, require enough public or supplied evidence to personalize the message without inventing pain, performance, or business conditions.

## Evidence classification

Classify material statements as:

- **Observed** — directly supported by supplied or verified evidence
- **Measured** — derived from valid first-party data or a controlled result
- **Proposed** — a recommended future workflow, system, or outcome
- **Creative** — nonfactual language, metaphor, or design treatment

Observed and measured claims require a source or evidence identifier. Proposed concepts must never be presented as already implemented. Vendor case studies may support possibility, not guaranteed lift.

For current pricing, regulations, platform capabilities, deliverability requirements, product specifications, or vendor claims, verify current sources before answering.

## Decisioning before generation

Determine these fields before writing copy:

1. eligibility
2. consent and suppression status
3. customer or prospect state
4. trigger or reason for contact
5. objective
6. product, service, or offer
7. verified facts and constraints
8. timing window
9. frequency policy
10. primary CTA
11. experiment assignment
12. fallback treatment

Generation may express an approved treatment. It may not decide authoritative prices, discounts, inventory, eligibility, legal language, regulated claims, expiration dates, or consent.

## Recommended implementation order

1. Repair identity, event, catalog, purchase, consent, and suppression data.
2. Establish domain authentication, bounce handling, complaints, unsubscribe, and inactive-recipient policies.
3. Build high-intent automated flows.
4. Add governed product recommendations.
5. Add predictive segments and timing optimization.
6. Generate controlled message variants.
7. Test with recipient-level controls.
8. expand only after repeatable margin-positive results.

## Lifecycle priority

Prioritize flows in this order unless evidence suggests otherwise:

1. cart or checkout abandonment
2. browse abandonment for considered purchases
3. price-drop or back-in-stock
4. replenishment or renewal
5. post-purchase education and cross-sell
6. welcome and onboarding
7. upsell based on verified usage or ownership
8. churn prevention
9. win-back
10. sunset or repermission

### Flow rules

#### Cart abandonment

Use exact cart contents, verified availability, shipping or return facts, and one fact-based benefit. Do not introduce a discount by default. Test convenience and reassurance before margin-destructive incentives.

#### Browse abandonment

Help the customer decide. Compare credible alternatives, buying criteria, or use cases rather than simply repeating “you viewed this.”

#### Replenishment

Use expected depletion plus shipping lead time. Suppress after a recent purchase, return, cancellation, or unresolved service issue.

#### Post-purchase

Deliver value before cross-selling. Sequence setup, usage, care, education, review, and complementary products according to the value-realization window.

#### Churn prevention

Never expose a churn score. Offer preference controls, useful service, relevant replenishment, or selective value. Include a frequency-reduction or pause path.

#### Win-back

Use the last meaningful purchase or preference, genuinely new value, and a selective incentive only when the economics justify it.

## Predictive segmentation

Segments must map to a treatment, not merely describe customers.

Useful states include:

- high purchase intent
- high value with low churn risk
- high value with rising churn risk
- price sensitive
- new customer
- repeat buyer near replenishment
- low engagement
- sparse or unknown history

Maintain an exploration allocation so customers are not trapped permanently in historical categories. Suppress products that are unavailable, inappropriate, recently returned, already owned when durable, or repeatedly ignored.

Do not expose sensitive inferences or judgmental labels in customer-facing content.

## Recommendation hierarchy

1. eligible and contactable customer
2. current context or lifecycle state
3. approved in-stock candidate set
4. affinity, complementarity, price fit, novelty, popularity, and margin ranking
5. diversity and exploration
6. business constraints and suppressions
7. transparent recommendation reason

All names, prices, specifications, images, inventory, offer terms, and compatibility claims must come from approved systems.

## Message architecture

Every conversion email should contain:

1. a credible reason for contact
2. one primary customer problem or desired outcome
3. verified relevance
4. a clear mechanism or value proposition
5. friction reduction or decision assistance
6. one primary CTA
7. optional secondary preference or comparison CTA
8. truthful urgency only when source-backed
9. an accessible plain-text equivalent

Avoid bloated feature lists, vague claims, artificial urgency, manipulative guilt, and personalization that feels invasive.

## Subject-line generation

Generate treatment diversity, not paraphrase volume. Use distinct hypotheses such as:

- benefit
- convenience
- specificity
- decision assistance
- newness
- verified savings
- ownership context
- category relevance
- earned loyalty value
- low-pressure reminder

Reject subject lines that:

- invent scarcity or deadlines
- imply surveillance
- expose sensitive inferences
- use unverifiable superlatives
- misrepresent the sender or content
- rely on spammy punctuation, generic urgency, or false familiarity

Select winners on purchases, revenue, or margin when volume permits—not opens alone.

## Luxury HTML email mode

When the user requests premium, luxury, executive, or high-end HTML:

- use a restrained visual hierarchy
- prefer generous whitespace, elegant typography, editorial pacing, and a narrow content column
- use dark neutrals, ivory, muted metallic accents, or brand-approved colors
- avoid gaudy gradients, excessive shadows, flashing elements, crowded cards, and “template marketplace” styling
- use table-based email-safe layout and inline CSS
- target a maximum content width near 600–680 pixels
- include descriptive alt text
- maintain sufficient contrast and readable mobile type
- make the primary CTA obvious without aggressive visual pressure
- include preview text and a plain-text fallback
- use only hosted HTTPS assets intended for email distribution
- never embed secrets, tracking credentials, private data, or local file paths

### Video in email

Most email clients do not reliably play embedded MP4 video. When video is requested:

1. use the AutoTube skill to produce a verified, hosted video asset
2. create a premium poster image with a clear play control
3. link the poster to a hosted landing-page player
4. optionally include a native `<video>` block only for supporting clients
5. include an image-and-link fallback for all other clients
6. never attach or embed a large base64 MP4 in the HTML
7. do not claim the video is embedded or playable until it has been tested in the target client

## Personalized B2B outreach

For cold or warm prospecting:

- use public, current, business-relevant observations
- tie the observation to a plausible operational or revenue opportunity
- label the proposed system as a concept or demonstration
- show one concise future workflow
- quantify only with verified numbers or transparent scenarios
- use a low-friction CTA such as reviewing a two-minute example
- do not diagnose pain as fact without evidence
- do not fabricate an email address, decision-maker, customer count, revenue, missed leads, or existing technology

Recommended structure:

1. why this specific recipient
2. what was observed
3. the missed opportunity or friction, framed carefully
4. the proposed mechanism
5. what the recipient would receive
6. one simple CTA

## Testing framework

Every test requires a written specification:

- business question
- eligible population
- unit of randomization
- control
- treatment
- primary metric
- guardrail metrics
- attribution window
- minimum detectable effect
- duration
- decision rule

Prefer customer-level randomization to send-level randomization. Keep customers in their assigned group for intent-to-treat analysis.

### Measurement hierarchy

1. incremental gross profit per eligible recipient
2. incremental purchase conversion
3. revenue per eligible recipient
4. repeat purchase, retention, or customer lifetime value
5. unique click-through rate
6. unsubscribe and complaint rate
7. bounce and inbox-placement health
8. open rate as a noisy diagnostic only

### Holdouts

For triggered flows, maintain a persistent randomized control when volume and risk permit. A control may receive the prior production treatment rather than no email when no-send is operationally inappropriate.

Do not use last-click attribution as proof of incrementality.

### Experiment sequence

- Stage A: AI treatment versus current production message
- Stage B: isolate subject, recommendation, body, CTA, timing, or frequency
- Stage C: estimate prespecified heterogeneous effects
- Stage D: compare predictive policy with simpler rules
- Stage E: maintain a persistent long-term holdout for fatigue and retention

Avoid adaptive bandits during initial learning unless the analysis plan explicitly accounts for them.

## Financial decision rule

Scale only when:

> Incremental gross profit > AI cost + platform cost + implementation cost + incremental discount cost + expected return, deliverability, and churn cost

Report:

- eligible customers
- treatment and control sizes
- incremental purchases
- incremental revenue
- incremental gross profit
- confidence interval or uncertainty range
- model and platform cost
- discount and return impact
- unsubscribe and complaint differences
- projected annual value at current eligible volume

Treat 0–5%, 5–15%, 15–30%, and greater-than-30% relative purchase lift as downside, base, upside, and exceptional planning scenarios—not universal evidence claims.

## Platform-selection logic

Evaluate platforms against:

- business model and lifecycle complexity
- commerce and catalog integration
- event latency
- identity resolution
- predictive segmentation
- recommendations
- send-time and frequency optimization
- experimentation and holdouts
- cross-channel orchestration
- approval and governance
- deliverability controls
- implementation capacity
- total cost, not license price alone

General fit:

- commerce-focused SMB: native commerce lifecycle platform first
- general SMB: simpler all-purpose email platform
- cross-channel midmarket: event-driven orchestration platform
- Salesforce-centered enterprise: Salesforce-native engagement stack
- SAP-centered retail enterprise: SAP engagement stack
- high-volume language experimentation: specialized creative-optimization layer
- differentiated proprietary workflow: custom OpenAI layer connected to an actual ESP, CRM/CDP, catalog, consent system, and validation pipeline

Never present a model provider as a substitute for an email service provider, journey engine, preference center, or deliverability system.

## Governance and compliance

Minimum controls:

- purpose-specific consent ledger
- centralized suppression before decisioning or generation
- unsubscribe and objection propagation
- data minimization
- sensitive-data prohibition by default
- transparent preference center
- retention policy
- role-based access and audit logs
- vendor and subprocessor review
- structured facts and schema-constrained generation
- deterministic validation
- brand, legal, and policy review
- seed tests, rendering checks, and link validation
- human review for high-risk claims or industries

The validator must reject any unapproved:

- price or percentage
- date or expiration
- product identifier
- offer term
- inventory or scarcity statement
- testimonial
- guarantee
- medical, legal, financial, compliance, or security claim
- eligibility or savings calculation

## Deliverability standard

Require:

- SPF
- DKIM
- DMARC alignment
- aligned sending domain
- one-click unsubscribe where required
- bounce and complaint processing
- inactive-recipient sunset policy
- provider-level monitoring
- controlled volume ramping
- suppression before generation
- frequency caps

Authentication does not compensate for irrelevant content or excessive frequency.

## Frequency policy template

Use a customer-level policy such as:

```text
maximum_marketing_emails_7d = 4
maximum_promotional_emails_24h = 1
high_intent_trigger_override = true
override_requires_incrementality_evidence = true
suppress_after_purchase_of_same_need = true
reduce_frequency_on_disengagement = true
```

Adjust to the business, jurisdiction, customer expectations, and tested evidence.

## Output modes

### Strategy

Return:

- business objective
- current-state gaps
- priority use cases
- data requirements
- platform or integration plan
- 30-, 60-, and 90-day roadmap
- measurement plan
- risks and controls

### Campaign or flow

Return:

- trigger and eligibility
- audience state
- treatment logic
- timing and cadence
- subject and preheader variants
- email body
- CTA
- personalization fields
- suppression rules
- control and treatment definition
- primary metric and guardrails

### HTML email

Return:

- subject
- preview text
- responsive table-based HTML
- plain-text fallback
- asset requirements
- link and rendering checklist
- video poster fallback when applicable

### Audit

Score 100 points:

- objective and economics: 15
- data and identity: 15
- lifecycle relevance: 15
- offer and recommendation integrity: 10
- copy and customer experience: 10
- experimentation and attribution: 15
- deliverability: 10
- privacy and governance: 10

A score below 85 requires remediation before expansion. Any consent, suppression, fabricated-claim, unsafe-personalization, or deliverability blocker prevents launch regardless of score.

## Self-critique passes

Before final approval, run:

1. **Customer truth test** — Is the message useful, relevant, non-invasive, and honest?
2. **Purchase and margin test** — Is the intervention likely to improve downstream value rather than only engagement?
3. **Evidence test** — Are all material claims sourced or clearly labeled as proposed?
4. **Deliverability test** — Could frequency, formatting, links, or language damage reputation?
5. **Privacy and consent test** — Is every recipient eligible and every data use appropriate?
6. **Experiment test** — Can the claimed impact be measured against a valid counterfactual?
7. **Subtraction test** — What can be removed without reducing clarity or conversion value?

Record each important defect, correction, and affected output element.

## Completion standard

An AI email program or campaign is complete only when:

- authoritative data sources are identified
- recipient eligibility and suppression are enforced
- facts and claims validate successfully
- rendering and links are tested
- plain-text fallback exists
- control and treatment are defined
- primary metric and guardrails are fixed in advance
- attribution window is documented
- monitoring and rollback are available
- the output is approved for the applicable risk level

A polished email is not proof of conversion. Attributed revenue is not proof of incrementality. A vendor case study is not a local business result.
