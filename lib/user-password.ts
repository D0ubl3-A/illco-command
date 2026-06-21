import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;
const PASSWORD_HASH_VERSION = "scrypt-v1";
type ScryptOptions = Parameters<typeof scrypt>[3];

export type PasswordValidationResult = {
  valid: boolean;
  reason: string | null;
};

export function validateAccountPassword(password: string): PasswordValidationResult {
  if (password.length < 10) {
    return { valid: false, reason: "Use at least 10 characters." };
  }

  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, reason: "Use letters and at least one number." };
  }

  return { valid: true, reason: null };
}

export async function hashAccountPassword(password: string) {
  const validation = validateAccountPassword(password);
  if (!validation.valid) {
    throw new Error(validation.reason || "Password does not meet account requirements.");
  }

  const salt = randomBytes(16);
  const derived = await deriveScryptKey(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEMORY,
  });

  return [
    PASSWORD_HASH_VERSION,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyAccountPassword(password: string, storedHash: string) {
  const [version, nText, rText, pText, saltText, hashText, extra] = storedHash.split("$");

  if (extra || version !== PASSWORD_HASH_VERSION || !nText || !rText || !pText || !saltText || !hashText) {
    return false;
  }

  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(hashText, "base64url");
  const derived = await deriveScryptKey(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: MAX_MEMORY,
  });

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function deriveScryptKey(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}
