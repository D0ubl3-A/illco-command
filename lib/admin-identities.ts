const builtInAdminEmails = ["aaronalltonai@gmail.com", "d0ubl3a0@gmail.com", "weallton@gmail.com", "admin@illcoai.tech"] as const;

function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function parseAdminEmailList(value: string | null | undefined) {
  return String(value || "")
    .split(/[\s,;|]+/)
    .map(normalizeEmail)
    .filter(Boolean);
}

export function getTrustedAdminEmails() {
  return new Set([
    ...builtInAdminEmails,
    ...parseAdminEmailList(process.env.ADMIN_ACCOUNT_EMAILS),
    ...parseAdminEmailList(process.env.ADMIN_EMAILS),
    ...parseAdminEmailList(process.env.MASTER_ADMIN_EMAIL),
  ]);
}

export function isTrustedAdminEmail(value: string | null | undefined) {
  const email = normalizeEmail(value);
  return Boolean(email && getTrustedAdminEmails().has(email));
}

export function getPublicTrustedAdminEmails() {
  return [...getTrustedAdminEmails()];
}
