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
export const labelAccountTypes = ["label_owner", "artist"] as const;
export const LABEL_COMMAND_OWNER_PRICE_CENTS = 5000;
export const LABEL_COMMAND_INCLUDED_SEATS = 2;
export const LABEL_COMMAND_EXTRA_SEAT_PRICE_CENTS = 1200;

export type LabelSourceStatus = (typeof labelSourceStatuses)[number];
export type LabelReleaseType = (typeof labelReleaseTypes)[number];
export type LabelReleaseStage = (typeof labelReleaseStages)[number];
export type LabelMemberRole = (typeof labelMemberRoles)[number];
export type LabelAccountType = (typeof labelAccountTypes)[number];

export const createLabelAccountInputSchema = z
  .object({
    accountType: z.enum(labelAccountTypes),
    displayName: z.string().trim().min(1).max(120),
    labelName: z.string().trim().max(120).optional().default(""),
    artistName: z.string().trim().max(120).optional().default(""),
    genre: z.string().trim().max(120).optional().default(""),
  })
  .superRefine((value, context) => {
    if (value.accountType === "label_owner" && !value.labelName) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["labelName"], message: "Label name is required." });
    }
    if (value.accountType === "artist" && !value.artistName) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["artistName"], message: "Artist name is required." });
    }
  });

export function labelCommandSeatTotalCents(seats: number) {
  const normalizedSeats = Math.max(1, Math.floor(seats));
  return LABEL_COMMAND_OWNER_PRICE_CENTS +
    Math.max(0, normalizedSeats - LABEL_COMMAND_INCLUDED_SEATS) * LABEL_COMMAND_EXTRA_SEAT_PRICE_CENTS;
}

const cleanText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((value) => value.replace(/\s+/g, " "));

const createNullableDate = z.preprocess(
  (value) => (value === undefined || value === null || value === "" ? null : value),
  z.string().date().nullable(),
);

const updateNullableDate = z.preprocess(
  (value) => (value === null || value === "" ? null : value),
  z.string().date().nullable(),
);

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
  targetDate: createNullableDate.optional().default(null),
  explicit: z.boolean().optional().default(false),
  notes: z.string().trim().max(5000).optional().default(""),
});

export const updateReleaseInputSchema = z
  .object({
    id: z.string().uuid(),
    title: cleanText(180).optional(),
    artistId: z.string().uuid().nullable().optional(),
    releaseType: z.enum(labelReleaseTypes).optional(),
    stage: z.enum(labelReleaseStages).optional(),
    targetDate: updateNullableDate.optional(),
    explicit: z.boolean().optional(),
    notes: z.string().trim().max(5000).optional(),
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
