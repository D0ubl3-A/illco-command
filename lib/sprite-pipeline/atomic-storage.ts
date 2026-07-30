import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const SHA256 = /^[a-f0-9]{64}$/;

export type StoredObject = {
  sha256: string;
  bytes: number;
  relativePath: string;
  absolutePath: string;
  reused: boolean;
};

export type AtomicStoreOptions = {
  root: string;
  maxBytes?: number;
  fileMode?: number;
};

function assertWithinRoot(root: string, target: string): void {
  const rel = relative(resolve(root), resolve(target));
  if (rel === ".." || rel.startsWith(`..${sep}`) || resolve(rel) === rel) {
    throw new Error(`Path escapes storage root: ${target}`);
  }
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function contentAddressedRelativePath(sha256: string, extension: string): string {
  if (!SHA256.test(sha256)) throw new Error("Invalid SHA-256 digest");
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (!/^[a-z0-9]{1,10}$/.test(ext)) throw new Error("Unsafe extension");
  return join("objects", sha256.slice(0, 2), `${sha256}.${ext}`);
}

export async function storeObjectAtomic(
  bytes: Uint8Array,
  extension: string,
  options: AtomicStoreOptions,
): Promise<StoredObject> {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) throw new Error("Cannot store an empty object");
  const maxBytes = options.maxBytes ?? 64 * 1024 * 1024;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error("maxBytes must be a positive safe integer");
  if (bytes.byteLength > maxBytes) throw new Error(`Object exceeds ${maxBytes} byte limit`);

  const root = resolve(options.root);
  const sha256 = digest(bytes);
  const relativePath = contentAddressedRelativePath(sha256, extension);
  const target = resolve(root, relativePath);
  assertWithinRoot(root, target);
  await mkdir(dirname(target), { recursive: true });

  try {
    const existing = await readFile(target);
    if (digest(existing) !== sha256 || existing.byteLength !== bytes.byteLength) {
      throw new Error(`Content-addressed object corruption detected at ${relativePath}`);
    }
    return { sha256, bytes: bytes.byteLength, relativePath, absolutePath: target, reused: true };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }

  const temporary = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
  assertWithinRoot(root, temporary);
  try {
    await writeFile(temporary, bytes, { flag: "wx", mode: options.fileMode ?? 0o640 });
    const handle = await open(temporary, "r+");
    try { await handle.sync(); } finally { await handle.close(); }
    const written = await readFile(temporary);
    if (digest(written) !== sha256 || written.byteLength !== bytes.byteLength) throw new Error("Temporary object verification failed");
    try {
      await rename(temporary, target);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST" && code !== "ENOTEMPTY") throw error;
      const winner = await readFile(target);
      if (digest(winner) !== sha256) throw new Error("Concurrent writer produced divergent content");
      await rm(temporary, { force: true });
    }
    const info = await stat(target);
    if (!info.isFile() || info.size !== bytes.byteLength) throw new Error("Committed object size mismatch");
    return { sha256, bytes: bytes.byteLength, relativePath, absolutePath: target, reused: false };
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function verifyStoredObject(root: string, relativePath: string, expectedSha256: string): Promise<void> {
  if (!SHA256.test(expectedSha256)) throw new Error("Invalid expected SHA-256 digest");
  const absolute = resolve(root, relativePath);
  assertWithinRoot(root, absolute);
  const bytes = await readFile(absolute);
  if (digest(bytes) !== expectedSha256) throw new Error(`Stored object hash mismatch: ${relativePath}`);
}
