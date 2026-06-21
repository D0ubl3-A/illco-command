function readEnvValue(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = stripWrappingQuotes(String(value || "").trim());
    if (normalized) return normalized;
  }
  return "";
}

function stripWrappingQuotes(value: string) {
  const first = value[0];
  const last = value[value.length - 1];
  if (value.length >= 2 && ((first === `"` && last === `"`) || (first === `'` && last === `'`))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function hasStorageDatabaseEnv() {
  return Boolean(readEnvValue(process.env.STORAGE_PGHOST) && readEnvValue(process.env.STORAGE_AWS_REGION));
}

export const env = {
  appBaseUrl: readEnvValue(process.env.APP_BASE_URL, process.env.NEXT_PUBLIC_APP_BASE_URL, "http://localhost:3000"),
  databaseUrl: readEnvValue(process.env.DATABASE_URL, process.env.POSTGRES_URL),
  storageDatabaseReady: hasStorageDatabaseEnv(),
  adminApiKey: readEnvValue(process.env.ADMIN_API_KEY),
  licenseSigningSecret: readEnvValue(process.env.LICENSE_SIGNING_SECRET),
  masterLicenseKey: readEnvValue(process.env.MASTER_LICENSE_KEY),
  licenseKeys: readEnvValue(process.env.LICENSE_KEYS),
  stripeSecretKey: readEnvValue(process.env.STRIPE_SECRET_KEY),
  stripeWebhookSecret: readEnvValue(process.env.STRIPE_WEBHOOK_SECRET),
  checkoutSessionSecret: readEnvValue(process.env.CHECKOUT_SESSION_SECRET, process.env.LICENSE_SIGNING_SECRET),
  stripePriceId: readEnvValue(process.env.STRIPE_PRICE_ID),
  stripePriceCoreId: readEnvValue(process.env.STRIPE_PRICE_CORE_ID, process.env.STRIPE_PRICE_ID),
  stripePriceStudioId: readEnvValue(process.env.STRIPE_PRICE_STUDIO_ID),
  stripePriceSuiteId: readEnvValue(process.env.STRIPE_PRICE_SUITE_ID, process.env.STRIPE_PRICE_AGENCY_ID),
  stripePriceAgencyId: readEnvValue(process.env.STRIPE_PRICE_AGENCY_ID),
  stripePriceEnterpriseId: readEnvValue(process.env.STRIPE_PRICE_ENTERPRISE_ID),
  globalFreeTrialDays: readEnvValue(process.env.GLOBAL_FREE_TRIAL_DAYS, process.env.STRIPE_TRIAL_DAYS, "7"),
  globalFreeTrialEnabled: readEnvValue(process.env.GLOBAL_FREE_TRIAL_ENABLED, "true"),
  stripeSuccessPath: readEnvValue(process.env.STRIPE_SUCCESS_PATH, "/account?checkout=success"),
  stripeCancelPath: readEnvValue(process.env.STRIPE_CANCEL_PATH, "/?checkout=cancelled"),
  leadWebhookUrl: readEnvValue(process.env.LEAD_WEBHOOK_URL, process.env.BETA_SIGNUP_WEBHOOK_URL),
  leadWebhookSecret: readEnvValue(process.env.LEAD_WEBHOOK_SECRET, process.env.BETA_SIGNUP_WEBHOOK_SECRET),
  codexApiKey: readEnvValue(process.env.CODEX_API_KEY, process.env.OPENAI_API_KEY),
  codexWorkspaceDirectory: readEnvValue(process.env.CODEX_WORKSPACE_DIRECTORY, process.cwd()),
  googleClientId: readEnvValue(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: readEnvValue(process.env.GOOGLE_CLIENT_SECRET),
  googleRedirectUri: readEnvValue(process.env.GOOGLE_REDIRECT_URI),
};

export function requireEnv(value: string, name: string) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function getConfigurationStatus() {
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
    customerPortalReady: Boolean(env.stripeSecretKey && env.checkoutSessionSecret),
    licenseIssuingReady: Boolean(env.adminApiKey && env.licenseSigningSecret),
    manualLicenseValidationReady: Boolean(env.masterLicenseKey || env.licenseKeys),
    leadCaptureReady: Boolean(env.databaseUrl || env.storageDatabaseReady || env.leadWebhookUrl),
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
  return Math.min(parsed, 730);
}
