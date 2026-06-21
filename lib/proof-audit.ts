import { products, type ProductRecord } from "@/lib/deployments";
import {
  getPreferredShowcaseVideo,
  getProofState,
  getQuickDemoVideo,
  getResultProofVideo,
  getTutorialVideo,
  type ShowcaseVideo,
} from "@/lib/demo-videos";
import { getMonetizationPlan } from "@/lib/monetization";

export type ProofAuditRow = {
  productId: string;
  displayName: string;
  publicInFunnel: boolean;
  productionUrl: string | null;
  proofReady: boolean;
  proofLabel: string;
  proofDetail: string;
  primaryMode: ShowcaseVideo["mode"] | null;
  hasQuickDemo: boolean;
  hasWalkthrough: boolean;
  needsResultProof: boolean;
  hasResultProof: boolean;
};

export type ProofAuditSnapshot = {
  generatedAt: string;
  summary: {
    publicOffers: number;
    proofReady: number;
    proofPending: number;
    fastDemoReady: number;
    walkthroughOnly: number;
    resultProofRequired: number;
    resultProofReady: number;
  };
  rows: ProofAuditRow[];
};

function rowFor(product: ProductRecord): ProofAuditRow | null {
  const plan = getMonetizationPlan(product.id);
  if (!plan?.publicInFunnel) return null;

  const proof = getProofState(product.id);
  const primary = getPreferredShowcaseVideo(product.id);
  const quickDemo = getQuickDemoVideo(product.id);
  const walkthrough = getTutorialVideo(product.id);
  const resultProof = getResultProofVideo(product.id);

  return {
    productId: product.id,
    displayName: product.displayName,
    publicInFunnel: true,
    productionUrl: product.productionUrl,
    proofReady: proof.ready,
    proofLabel: proof.label,
    proofDetail: proof.detail,
    primaryMode: primary?.mode || null,
    hasQuickDemo: Boolean(quickDemo),
    hasWalkthrough: Boolean(walkthrough),
    needsResultProof: proof.requiresResultProof,
    hasResultProof: Boolean(resultProof),
  };
}

export function getProofAuditSnapshot(): ProofAuditSnapshot {
  const rows = products
    .map((product) => rowFor(product))
    .filter((row): row is ProofAuditRow => Boolean(row))
    .sort((left, right) => {
      if (left.proofReady !== right.proofReady) return left.proofReady ? 1 : -1;
      if (left.needsResultProof !== right.needsResultProof) return left.needsResultProof ? -1 : 1;
      return left.displayName.localeCompare(right.displayName);
    });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      publicOffers: rows.length,
      proofReady: rows.filter((row) => row.proofReady).length,
      proofPending: rows.filter((row) => !row.proofReady).length,
      fastDemoReady: rows.filter((row) => row.primaryMode === "route-proof" && row.proofReady).length,
      walkthroughOnly: rows.filter((row) => row.primaryMode === "full-walkthrough" && row.proofReady).length,
      resultProofRequired: rows.filter((row) => row.needsResultProof).length,
      resultProofReady: rows.filter((row) => row.needsResultProof && row.hasResultProof).length,
    },
    rows,
  };
}
