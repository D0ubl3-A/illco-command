const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s*prompt/i,
  /developer\s*message/i,
  /reveal\s+(secrets?|credentials?|tokens?)/i,
  /execute\s+(shell|command|code)/i,
  /<\/?script\b/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
];

export type MetadataLimits = {
  maxDepth: number;
  maxKeys: number;
  maxStringLength: number;
  maxArrayLength: number;
  maxSerializedBytes: number;
};

export const DEFAULT_METADATA_LIMITS: MetadataLimits = {
  maxDepth: 12,
  maxKeys: 2_000,
  maxStringLength: 32_000,
  maxArrayLength: 5_000,
  maxSerializedBytes: 1_000_000,
};

export type MetadataSecurityResult = {
  passed: boolean;
  failures: string[];
  keyCount: number;
  maxObservedDepth: number;
};

export function validateUntrustedMetadata(value: unknown, limits: MetadataLimits = DEFAULT_METADATA_LIMITS): MetadataSecurityResult {
  const failures: string[] = [];
  let keyCount = 0;
  let maxObservedDepth = 0;
  const seen = new WeakSet<object>();
  const fail = (message: string) => { if (!failures.includes(message)) failures.push(message); };

  const visit = (node: unknown, path: string, depth: number): void => {
    maxObservedDepth = Math.max(maxObservedDepth, depth);
    if (depth > limits.maxDepth) { fail(`metadata depth exceeds ${limits.maxDepth}`); return; }
    if (node === null || typeof node === "boolean" || typeof node === "number") {
      if (typeof node === "number" && !Number.isFinite(node)) fail(`${path} contains a non-finite number`);
      return;
    }
    if (typeof node === "string") {
      if (node.length > limits.maxStringLength) fail(`${path} exceeds maximum string length`);
      if (CONTROL.test(node)) fail(`${path} contains control characters`);
      for (const pattern of INJECTION_PATTERNS) if (pattern.test(node)) fail(`${path} contains prompt or script injection content`);
      return;
    }
    if (typeof node !== "object") { fail(`${path} contains unsupported type ${typeof node}`); return; }
    if (seen.has(node as object)) { fail(`${path} contains a cyclic reference`); return; }
    seen.add(node as object);
    if (Array.isArray(node)) {
      if (node.length > limits.maxArrayLength) fail(`${path} exceeds maximum array length`);
      node.forEach((child, index) => visit(child, `${path}[${index}]`, depth + 1));
      return;
    }
    const proto = Object.getPrototypeOf(node);
    if (proto !== Object.prototype && proto !== null) fail(`${path} must be a plain object`);
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      keyCount += 1;
      if (keyCount > limits.maxKeys) fail(`metadata key count exceeds ${limits.maxKeys}`);
      if (DANGEROUS_KEYS.has(key)) fail(`${path} contains dangerous key ${key}`);
      if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(key)) fail(`${path} contains unsafe key ${key}`);
      visit(child, `${path}.${key}`, depth + 1);
    }
  };

  visit(value, "$", 0);
  try {
    const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
    if (bytes > limits.maxSerializedBytes) fail(`metadata exceeds ${limits.maxSerializedBytes} serialized bytes`);
  } catch {
    fail("metadata is not safely serializable");
  }
  return { passed: failures.length === 0, failures, keyCount, maxObservedDepth };
}

export function parseJsonMetadata(input: string, limits: MetadataLimits = DEFAULT_METADATA_LIMITS): unknown {
  if (Buffer.byteLength(input, "utf8") > limits.maxSerializedBytes) throw new Error("JSON metadata exceeds byte limit");
  const value = JSON.parse(input) as unknown;
  const result = validateUntrustedMetadata(value, limits);
  if (!result.passed) throw new Error(result.failures.join("; "));
  return value;
}
