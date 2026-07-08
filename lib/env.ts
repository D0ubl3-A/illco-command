function readEnvValue(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = stripEnvControlCharacters(stripWrappingQuotes(String(value || "").trim().replace(/^\uFEFF/, "")));
    if (normalized) return normalized;
  }
  return "";
}

function stripEnvControlCharacters(value: string) {
  return value
    .replace(/\\r|\\n|\\t/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

function stripWrappingQuotes(value: string) {
  const first = value[0];
  const last = value[value.length - 1];
  if (value.length >= 2 && ((first === `"` && last === `"`) || (first === "'" && last === "'"))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function splitEmailValues(value: string | undefined) {
  return String(value || "")
    .split(/[\s,;|]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function uniqueEmailList(values: Array<string | undefined>) {
  const emails = new Set<string>();
  for (const entry of values) {
    for (const email of splitEmailValues(entry)) {
      emails.add(email);
    }
  }
  return [...emails];
}

function hasStorageDatabaseEnv() {
  return Boolean(
    readEnvValue(process.env.STORAGE_PGHOST, process.env.db_url_PGHOST) && readEnvValue(process.env.STORAGE_AWS_REGION, process.env.db_url_AWS_REGION),
  );
}

const configuredLeadWebhookUrl = readEnvValue(
  process.env.LEAD_WEBHOOK_URL,
  process.env.BETA_SIGNUP_WEBHOOK_URL,
  process.env.LEAD_WEBHOOK_ENDPOINT,
);
const configuredLeadAdminEmails = uniqueEmailList([
  process.env.LEAD_ADMIN_EMAILS,
  process.env.LEAD_ADMIN_EMAIL,
  process.env.ADMIN_ACCOUNT_EMAILS,
  process.env.ADMIN_EMAILS,
  process.env.MASTER_ADMIN_EMAIL,
  "admin@illcoai.tech",
]);

export const env = {
  appBaseUrl: readEnvValue(
    process.env.APP_BASE_URL,
    process.env.NEXT_PUBLIC_APP_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "https://illco-ai-app-store.vercel.app",
  ),
  databaseUrl: readEnvValue(process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.db_url_DATABASE_URL),
  storageDatabaseReady: hasStorageDatabaseEnv(),
  adminApiKey: readEnvValue(process.env.ADMIN_API_KEY, process.env.ADMIN_SECRET, process.env.ADMIN_PASSWORD, process.env.ADMIN_TOKEN),
  licenseSigningSecret: readEnvValue(process.env.LICENSE_SIGNING_SECRET, process.env.LICENSE_SIGNING_KEY, process.env.MASTER_LICENSE_SECRET),
  masterLicenseKey: readEnvValue(process.env.MASTER_LICENSE_KEY),
  licenseKeys: readEnvValue(process.env.LICENSE_KEYS, process.env.LICENSE_KEY_LIST),
  stripeSecretKey: readEnvValue(process.env.STRIPE_SECRET_KEY, process.env.STRIPE_SECRET),
  stripeWebhookSecret: readEnvValue(process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_WEBHOOK_SIGNING_SECRET, process.env.WEBHOOK_SECRET),
  checkoutSessionSecret: readEnvValue(process.env.CHECKOUT_SESSION_SECRET, process.env.SESSION_SECRET, process.env.LICENSE_SIGNING_SECRET),
  stripePriceId: readEnvValue(process.env.STRIPE_PRICE_ID, process.env.STRIPE_PLAN_PRICE_ID),
  stripePriceCoreId: readEnvValue(process.env.STRIPE_PRICE_CORE_ID, process.env.CORE_PRICE_ID, process.env.STRIPE_PRICE_ID),
  stripePriceStudioId: readEnvValue(process.env.STRIPE_PRICE_STUDIO_ID, process.env.STUDIO_PRICE_ID, process.env.STRIPE_PRICE_ID),
  stripePriceSuiteId: readEnvValue(process.env.STRIPE_PRICE_SUITE_ID, process.env.STRIPE_PRICE_AGENCY_ID, process.env.SUITE_PRICE_ID),
  stripePriceAgencyId: readEnvValue(process.env.STRIPE_PRICE_AGENCY_ID, process.env.AGENCY_PRICE_ID),
  stripePriceEnterpriseId: readEnvValue(process.env.STRIPE_PRICE_ENTERPRISE_ID, process.env.ENTERPRISE_PRICE_ID),
  globalFreeTrialDays: readEnvValue(process.env.GLOBAL_FREE_TRIAL_DAYS, process.env.STRIPE_TRIAL_DAYS, "1"),
  globalFreeTrialEnabled: readEnvValue(process.env.GLOBAL_FREE_TRIAL_ENABLED, "true"),
  stripeSuccessPath: readEnvValue(process.env.STRIPE_SUCCESS_PATH, "/account?checkout=success"),
  stripeCancelPath: readEnvValue(process.env.STRIPE_CANCEL_PATH, "/?checkout=cancelled"),
  leadWebhookUrl: configuredLeadWebhookUrl,
  leadSpreadsheetWebhookUrl: configuredLeadWebhookUrl,
  leadAdminNotificationWebhookUrl: readEnvValue(
    process.env.LEAD_ADMIN_NOTIFICATION_WEBHOOK_URL,
    process.env.LEAD_NOTIFICATION_WEBHOOK_URL,
  ),
  leadAdminEmails: configuredLeadAdminEmails,
  groqApiKey: readEnvValue(process.env.GROQ_API_KEY, process.env.GROQ_SECRET_KEY),
  leadWebhookSecret: readEnvValue(
    process.env.LEAD_WEBHOOK_SECRET,
    process.env.BETA_SIGNUP_WEBHOOK_SECRET,
    process.env.LEAD_WEBHOOK_SIGNING_SECRET,
  ),
  codexApiKey: readEnvValue(process.env.CODEX_API_KEY, process.env.OPENAI_API_KEY, process.env.OPENAI_SECRET),
  codexWorkspaceDirectory: readEnvValue(process.env.CODEX_WORKSPACE_DIRECTORY, process.cwd()),
  googleClientId: readEnvValue(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  googleClientSecret: readEnvValue(process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_OAUTH_CLIENT_SECRET),
  googleRedirectUri: readEnvValue(
    process.env.GOOGLE_REDIRECT_URI,
    process.env.GOOGLE_OAUTH_REDIRECT_URI,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI,
  ),
  referralCommissionRatePercent: Number.parseFloat(readEnvValue(process.env.REFERRAL_COMMISSION_RATE_PERCENT, "20")),
  referralCashoutMinimumCents: Number.parseInt(readEnvValue(process.env.REFERRAL_CASHOUT_MINIMUM_CENTS, "2500"), 10),
  referralCommissionHoldDays: Number.parseInt(readEnvValue(process.env.REFERRAL_COMMISSION_HOLD_DAYS, "14"), 10),
  referralCurrency: readEnvValue(process.env.REFERRAL_CURRENCY, "usd"),
  elevenLabsApiKey: readEnvValue(process.env.ELEVENLABS_API_KEY, process.env.ELEVENLABS_SECRET_KEY),
  m3ntallyIllVoiceId: readEnvValue(process.env.ELEVENLABS_M3NTALLY_ILL_VOICE_ID, process.env.ELEVENLABS_VOICE_ID),
  elevenLabsModelId: readEnvValue(process.env.ELEVENLABS_MODEL_ID, "eleven_multilingual_v2"),
};

export function requireEnv(value: string, name: string) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function getConfigurationStatus() {
  const stripeMode: "live" | "test" | "missing" = env.stripeSecretKey.startsWith("sk_live_")
    ? "live"
    : env.stripeSecretKey.startsWith("sk_test_")
      ? "test"
      : "missing";
  const planPrices = {
    core: Boolean(env.stripePriceCoreId),
    studio: Boolean(env.stripePriceStudioId),
    suite: Boolean(env.stripePriceSuiteId),
    agency: Boolean(env.stripePriceAgencyId),
    enterprise: Boolean(env.stripePriceEnterpriseId),
  };

  return {
    subscriptionsReady: Boolean(env.stripeSecretKey && Object.values(planPrices).some(Boolean)),
    stripeWebhooksReady: Boolean(env.stripeSecretKey && env.stripeWebhookSecret),
    stripeMode,
    customerPortalReady: Boolean(env.stripeSecretKey && env.checkoutSessionSecret),
    licenseIssuingReady: Boolean(env.adminApiKey && env.licenseSigningSecret),
    manualLicenseValidationReady: Boolean(env.masterLicenseKey || env.licenseKeys),
    leadCaptureReady: Boolean(env.leadSpreadsheetWebhookUrl || env.leadAdminNotificationWebhookUrl),
    codexSdkReady: Boolean(env.codexApiKey),
    googleOAuthReady: Boolean(env.googleClientId && env.googleClientSecret),
    freeTrialDays: getGlobalFreeTrialDays(),
    planPrices,
  };
}

export type FunnelPlanId = "core" | "studio" | "suite" | "agency" | "enterprise";

export function getStripePriceIdForPlan(planId: FunnelPlanId) {
  const prices: Record<FunnelPlanId, string> = {
    core: env.stripePriceCoreId,
    studio: env.stripePriceStudioId,
    suite: env.stripePriceSuiteId,
    agency: env.stripePriceAgencyId,
    enterprise: env.stripePriceEnterpriseId,
  };
  return prices[planId];
}

export function getGlobalFreeTrialDays() {
  const enabled = env.globalFreeTrialEnabled.toLowerCase() !== "false";
  if (!enabled) return null;

  const parsed = Number.parseInt(env.globalFreeTrialDays, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.min(parsed, 1);
}
