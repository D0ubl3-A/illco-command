import { z } from "zod";

export const labelSourceStatuses = ["live", "manual", "demo", "disconnected", "syncing", "error"] as const;
export const labelReleaseTypes = ["single", "ep", "album"] as const;
export const labelReleaseStages = [
  "draft",
  "needs_information",
  "ready_for_review",
  "under_review",
  "approved",
  "scheduled",
  "delivered",
  "processing",
  "live",
  "rejected",
  "correction_required",
  "takedown_requested",
  "archived",
] as const;
export const labelMemberRoles = ["owner", "admin", "manager", "artist", "producer", "songwriter", "marketing", "accountant", "viewer"] as const;

export type LabelSourceStatus = (typeof labelSourceStatuses)[number];
export type LabelReleaseType = (typeof labelReleaseTypes)[number];
export type LabelReleaseStage = (typeof labelReleaseStages)[number];
export type LabelMemberRole = (typeof labelMemberRoles)[number];

const cleanText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((value) => value.replace(/\s+/g, " "));

const nullableDate = z
  .union([z.string().date(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? value : null));

export const createArtistInputSchema = z.object({
  name: cleanText(120),
  genre: z.string().trim().max(120).optional().default(""),
  status: z.enum(["active", "development", "paused", "archived"]).optional().default("active"),
});

export const createReleaseInputSchema = z.object({
  title: cleanText(180),
  artistId: z.string().uuid().nullable().optional().default(null),
  releaseType: z.enum(labelReleaseTypes).optional().default("single"),
  stage: z.enum(labelReleaseStages).optional().default("draft"),
  targetDate: nullableDate,
  explicit: z.boolean().optional().default(false),
  notes: z.string().trim().max(5000).optional().default(""),
});

export const updateReleaseInputSchema = createReleaseInputSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "id"),
    "At least one release field must be supplied.",
  );

export function normalizeLabelSlug(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "label";
}

export function labelStageTitle(stage: LabelReleaseStage) {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function validateSplitTotal(shares: number[]) {
  if (!shares.every((share) => Number.isFinite(share) && share >= 0 && share <= 100)) {
    return { valid: false, total: Number.NaN, reason: "Each split must be between 0 and 100." };
  }

  const total = Math.round(shares.reduce((sum, share) => sum + share, 0) * 10000) / 10000;
  if (total !== 100) {
    return { valid: false, total, reason: `Splits total ${total}%. They must total exactly 100%.` };
  }

  return { valid: true, total, reason: null };
}
