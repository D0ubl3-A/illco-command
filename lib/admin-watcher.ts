import { getAdminRepairQueueSnapshot } from "@/lib/admin-repair-queue";
import { getConfigurationStatus } from "@/lib/env";
import { monetizationCoverage, monetizationPlan } from "@/lib/monetization";
import { getProofAuditSnapshot } from "@/lib/proof-audit";
import { projectHealth } from "@/lib/project-health";
import { getShaylaFeedbackSnapshot } from "@/lib/shayla-feedback";

export type AdminWatcherSnapshot = ReturnType<typeof getAdminWatcherSnapshot>;

export function getAdminWatcherSnapshot() {
  const config = getConfigurationStatus();
  const proofAudit = getProofAuditSnapshot();
  const shaylaFeedback = getShaylaFeedbackSnapshot();
  const repairQueue = getAdminRepairQueueSnapshot();
  const health = projectHealth.summary;
  const behavior = monetizationPlan.summary.healthGateBehavior;
  const configuredPlans = Object.values(config.planPrices).filter(Boolean).length;
  const blockers = [
    health.offline ? `${health.offline} deployed routes are offline.` : "",
    health.degraded ? `${health.degraded} deployed routes are degraded.` : "",
    proofAudit.summary.proofPending ? `${proofAudit.summary.proofPending} public offers still need proof/tutorial evidence.` : "",
    config.subscriptionsReady ? "" : "Subscription checkout is not fully configured.",
    config.licenseIssuingReady ? "" : "License issuing is not fully configured.",
    config.leadCaptureReady ? "" : "Lead capture has no database or webhook target.",
    config.codexSdkReady ? "" : "Codex SDK provider is locked until CODEX_API_KEY or OPENAI_API_KEY is configured.",
    monetizationCoverage.complete ? "" : "Monetization coverage is incomplete.",
  ].filter(Boolean);

  const events = [
    {
      tone: blockers.length ? "warning" : "ready",
      label: blockers.length ? "Operator attention required" : "Control plane ready",
      detail: blockers[0] || "No high-level blockers detected by the watcher.",
      at: new Date().toISOString(),
    },
    {
      tone: health.offline || health.degraded ? "warning" : "ready",
      label: "Deployment health",
      detail: `${health.healthy} healthy, ${health.degraded} degraded, ${health.offline} offline.`,
      at: projectHealth.generatedAt || new Date().toISOString(),
    },
    {
      tone: proofAudit.summary.proofPending ? "warning" : "ready",
      label: "Demo proof",
      detail: `${proofAudit.summary.proofReady}/${proofAudit.summary.publicOffers} public offers have proof-ready video coverage.`,
      at: proofAudit.generatedAt,
    },
    {
      tone: behavior["block-checkout"] || behavior["manual-review"] ? "neutral" : "ready",
      label: "Monetization gates",
      detail: `${behavior["allow-checkout"] || 0} direct checkout, ${behavior["manual-review"] || 0} manual review, ${behavior["block-checkout"] || 0} blocked.`,
      at: monetizationPlan.generatedAt,
    },
    {
      tone: repairQueue.queued ? "warning" : "ready",
      label: "Repair queue",
      detail: repairQueue.queued
        ? `${repairQueue.queued} repair requests are queued for operator review.`
        : "No repair requests are currently queued.",
      at: repairQueue.requests[0]?.createdAt || new Date().toISOString(),
    },
    {
      tone: shaylaFeedback.pendingActionItems.length ? "warning" : "ready",
      label: "Shayla feedback",
      detail: shaylaFeedback.newest
        ? `${shaylaFeedback.pendingActionItems.length} pending creative action items. Latest: ${shaylaFeedback.newest.message}`
        : "No Shayla creative feedback has been submitted yet.",
      at: shaylaFeedback.newest?.createdAt || new Date().toISOString(),
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    checkIntervalMs: 300000,
    summary: {
      products: monetizationPlan.summary.totalProducts,
      publicInFunnel: monetizationPlan.summary.publicInFunnel,
      healthy: health.healthy,
      degraded: health.degraded,
      offline: health.offline,
      proofReady: proofAudit.summary.proofReady,
      proofPending: proofAudit.summary.proofPending,
      blockers: blockers.length,
    },
    operationalSections: [
      {
        id: "public-funnel",
        label: "Public funnel",
        tone: monetizationPlan.summary.publicInFunnel > 0 ? "ready" : "warning",
        detail: "Homepage, app directory, CTAs, offer routing, and public buyer navigation.",
        metric: `${monetizationPlan.summary.publicInFunnel} public offers`,
        repairReason: "Audit and repair public funnel layout, navigation, offer routing, and broken buyer CTAs.",
      },
      {
        id: "app-modules",
        label: "App modules",
        tone: health.offline || health.degraded ? "warning" : "ready",
        detail: "Product app pages, connected module routes, and app-specific landing surfaces.",
        metric: `${health.healthy} healthy / ${health.degraded} degraded / ${health.offline} offline`,
        repairReason: "Check app module routes, fix broken product pages, and remove unavailable direct-open paths.",
      },
      {
        id: "checkout-subscriptions",
        label: "Checkout and subscriptions",
        tone: config.subscriptionsReady && configuredPlans > 0 ? "ready" : "blocked",
        detail: "Stripe secret, plan price ids, subscription checkout, success return, and account entitlements.",
        metric: `${configuredPlans}/5 configured plans`,
        repairReason: "Repair subscription checkout readiness, Stripe plan mapping, return paths, and account unlock flow.",
      },
      {
        id: "account-oauth",
        label: "Account and OAuth",
        tone: config.googleOAuthReady ? "ready" : "warning",
        detail: "Google login, user account panel, profile access, subscription view, and admin session bridge.",
        metric: config.googleOAuthReady ? "OAuth configured" : "OAuth missing",
        repairReason: "Review Google OAuth redirect/session flow and repair account profile/subscription visibility.",
      },
      {
        id: "admin-operator",
        label: "Admin operator desk",
        tone: config.licenseIssuingReady || config.manualLicenseValidationReady ? "ready" : "warning",
        detail: "Admin login, operator panels, license tooling, watcher, and guarded operator actions.",
        metric: config.licenseIssuingReady ? "License issuing ready" : "License tooling partial",
        repairReason: "Repair admin operator tools, guarded action state, and license/admin key readiness.",
      },
      {
        id: "watcher-repair",
        label: "Watcher and repair queue",
        tone: repairQueue.queued ? "warning" : "ready",
        detail: "Five-minute watcher checks, repair request intake, and operator review queue.",
        metric: `${repairQueue.queued} queued repairs`,
        repairReason: "Review watcher refresh, repair queue intake, and queued repair request visibility.",
      },
      {
        id: "leads-contact",
        label: "Leads and contact",
        tone: config.leadCaptureReady ? "ready" : "blocked",
        detail: "Lead forms, setup requests, admin notification path, and customer intake data.",
        metric: config.leadCaptureReady ? "Lead capture ready" : "No lead target",
        repairReason: "Repair lead capture delivery, setup request routing, and admin notification coverage.",
      },
      {
        id: "proof-video",
        label: "Proof and video",
        tone: proofAudit.summary.proofPending ? "warning" : "ready",
        detail: "Product proof clips, tutorials, demo embeds, header media, and proof-led buying flow.",
        metric: `${proofAudit.summary.proofReady}/${proofAudit.summary.publicOffers} proof ready`,
        repairReason: "Repair missing proof videos, broken embeds, product visual alignment, and demo routing.",
      },
      {
        id: "tools-workspace",
        label: "Tools workspace",
        tone: config.codexSdkReady ? "ready" : "warning",
        detail: "ILLCO Tools, Think For Me Mode, Codex SDK features, and internal tool routing.",
        metric: config.codexSdkReady ? "SDK configured" : "SDK key missing",
        repairReason: "Repair tools workspace routing, SDK readiness, and locked tool messaging.",
      },
      {
        id: "blog-seo",
        label: "Blog and SEO",
        tone: "neutral",
        detail: "Blog index, article pages, sitemap, robots, metadata, and organic content routes.",
        metric: "Static routes generated",
        repairReason: "Audit blog/SEO pages, metadata, sitemap, canonical paths, and article rendering.",
      },
      {
        id: "media-assets",
        label: "Media and product images",
        tone: "neutral",
        detail: "Hero videos, product images, viral SVGs, posters, and asset cropping.",
        metric: "Visual asset pass",
        repairReason: "Review media assets, product image cropping, header video crop, and missing branded visuals.",
      },
      {
        id: "deployment-health",
        label: "Deployment health",
        tone: health.offline || health.degraded ? "warning" : "ready",
        detail: "Vercel app health, route checks, production alias, and deployed app availability.",
        metric: `${health.healthy} healthy routes`,
        repairReason: "Repair degraded/offline deployments, alias drift, and production route failures.",
      },
    ],
    config,
    monetization: {
      coverageComplete: monetizationCoverage.complete,
      behavior,
      needsDemoVideo: monetizationPlan.summary.needsDemoVideo,
    },
    repairQueue,
    blockers,
    events,
    capabilities: [
      {
        id: "monitor",
        label: "Monitor funnel, proof, health, and config state",
        enabled: true,
      },
      {
        id: "license",
        label: "Issue and validate licenses",
        enabled: config.licenseIssuingReady || config.manualLicenseValidationReady,
      },
      {
        id: "billing",
        label: "Open admin Stripe billing portal",
        enabled: Boolean(config.customerPortalReady),
      },
      {
        id: "leads",
        label: "Capture and triage leads",
        enabled: config.leadCaptureReady,
      },
      {
        id: "demos",
        label: "Audit tutorial/demo coverage",
        enabled: true,
      },
      {
        id: "codex-sdk",
        label: "Codex SDK for Agency and Enterprise subscribers",
        enabled: config.codexSdkReady,
        reason: config.codexSdkReady ? undefined : "Set CODEX_API_KEY or OPENAI_API_KEY before enabling SDK runs.",
      },
      {
        id: "deploy",
        label: "Production deploy authority",
        enabled: false,
        reason: "Root-only deploys require explicit verification outside the browser assistant.",
      },
    ],
  };
}

export function answerAdminAssistant(message: string, snapshot = getAdminWatcherSnapshot()) {
  const normalized = message.toLowerCase();
  const primaryBlockers = snapshot.blockers.slice(0, 4);
  const lines = [
    `Watcher snapshot: ${snapshot.summary.healthy} healthy, ${snapshot.summary.degraded} degraded, ${snapshot.summary.offline} offline routes across ${snapshot.summary.products} products.`,
  ];

  if (normalized.includes("deploy")) {
    lines.push("Deploys stay root-only. I can summarize readiness, but I will not trigger production deploys from this assistant.");
  } else if (normalized.includes("license") || normalized.includes("billing")) {
    lines.push(
      snapshot.config.licenseIssuingReady
        ? "License issuing is configured. Use the admin license panel for signed license actions."
        : "License issuing is not fully configured. Set ADMIN_API_KEY and LICENSE_SIGNING_SECRET before issuing production licenses.",
    );
    lines.push(
      snapshot.config.customerPortalReady
        ? "Billing portal tooling is configured for admin use."
        : "Billing portal tooling is not fully configured.",
    );
  } else if (normalized.includes("demo") || normalized.includes("video") || normalized.includes("tutorial")) {
    lines.push(`${snapshot.summary.proofPending} public offers still need proof-ready tutorial/result videos.`);
  } else if (normalized.includes("health") || normalized.includes("broken") || normalized.includes("offline")) {
    lines.push(`${snapshot.summary.offline} routes are offline and ${snapshot.summary.degraded} are degraded. These must stay out of direct checkout.`);
  } else {
    lines.push("I can monitor health, proof, monetization gates, config readiness, licenses, billing, leads, and demo coverage from this admin surface.");
  }

  if (primaryBlockers.length) {
    lines.push(`Top blockers: ${primaryBlockers.join(" ")}`);
  } else {
    lines.push("No top-level watcher blockers are currently reported.");
  }

  return {
    reply: lines.join("\n\n"),
    snapshot,
  };
}
