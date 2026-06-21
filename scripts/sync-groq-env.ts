import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { products } from "../lib/deployments";

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

const workspaceRoot = path.resolve("artifacts/vercel-env-sync");
const defaultEnvNames = ["GROQ_API_KEY"];
const scope = process.env.VERCEL_SCOPE || "illcoai";
const vercelCommand = process.platform === "win32" ? "vercel.cmd" : "vercel";
const knownGroqCandidateNames = new Set(["gardening-site-grqp", "automateflow", "cortex-intelligence", "illcoflow", "novastream", "bookie"]);

function readArg(name: string) {
  const prefix = `--${name}=`;
  const exact = `--${name}`;
  const index = process.argv.findIndex((arg) => arg === exact || arg.startsWith(prefix));
  if (index === -1) return null;
  const current = process.argv[index];
  if (current.startsWith(prefix)) return current.slice(prefix.length);
  return process.argv[index + 1] && !process.argv[index + 1].startsWith("--") ? process.argv[index + 1] : "true";
}

function readBoolean(name: string, fallback = false) {
  const raw = readArg(name);
  if (!raw) return fallback;
  return /^(1|true|yes)$/i.test(raw);
}

function readPositiveInt(name: string, fallback: number) {
  const raw = readArg(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`--${name} must be a non-negative number.`);
  }
  return Math.floor(value);
}

function readCsvArg(name: string, fallback: string[] = []) {
  const raw = readArg(name);
  if (!raw) return fallback;
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

function redact(value: string, secrets: readonly string[]) {
  let output = value;
  for (const secret of secrets) {
    if (secret.length >= 6) output = output.split(secret).join("[REDACTED]");
  }
  return output.replace(/(GROQ_[A-Z_]+=)[^\s]+/g, "$1[REDACTED]");
}

function run(command: string, args: string[], cwd: string, input?: string, secrets: string[] = []): Promise<CommandResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CommandResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    let child;
    try {
      child = spawn(command, args, {
        cwd,
        shell: process.platform === "win32",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      finish({ code: null, stdout: "", stderr: redact(message, secrets) });
      return;
    }
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      finish({ code: null, stdout: redact(stdout, secrets), stderr: redact(error.message, secrets) });
    });
    child.on("close", (code) => {
      finish({ code, stdout: redact(stdout, secrets), stderr: redact(stderr, secrets) });
    });
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

function candidateProducts() {
  const explicit = new Set(readCsvArg("project-ids"));
  if (explicit.size > 0) {
    return products.filter((product) => explicit.has(product.id) || explicit.has(product.name));
  }

  return products.filter((product) => {
    if (!product.productionUrl) return false;
    return (
      knownGroqCandidateNames.has(product.name) ||
      /(ai|groq|grq|bot|agent|voice|video|lyric|lipsync|sora|codex|gateway|workstation|lab|cortex|flow|nova|bookie)/i.test(
        product.name,
      )
    );
  });
}

function getGroqSecret(envName: string) {
  return process.env[envName] || (envName === "GROQ_KEY" ? process.env.GROQ_API_KEY : "");
}

function assertSafeIdentifier(value: string, label: string) {
  if (/^[a-z0-9_.-]+$/i.test(value)) return;
  throw new Error(`${label} contains unsupported characters: ${value}`);
}

function assertSafeEnvName(value: string) {
  if (/^GROQ[A-Z0-9_]*$/.test(value)) return;
  throw new Error(`Only GROQ-prefixed env names are supported by this sync tool: ${value}`);
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const start = Math.min(
    ...["[", "{"].map((marker) => {
      const index = trimmed.indexOf(marker);
      return index === -1 ? Number.POSITIVE_INFINITY : index;
    }),
  );
  if (!Number.isFinite(start)) return null;
  try {
    return JSON.parse(trimmed.slice(start));
  } catch {
    return null;
  }
}

async function listEnvNames(cwd: string) {
  const result = await run(vercelCommand, ["env", "ls", "production", "-F", "json", "--scope", scope], cwd);
  if (result.code !== 0) {
    return { ok: false, names: [] as string[], detail: result.stderr || result.stdout };
  }

  const parsed = extractJson(result.stdout);
  const items: Array<{ key?: unknown; name?: unknown }> | null = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.envs)
      ? parsed.envs
      : null;
  if (!items) {
    return { ok: false, names: [] as string[], detail: "env list did not return parseable JSON; not safe to compare env names" };
  }

  const names = items
    .map((item) => String(item?.key || item?.name || ""))
    .filter(Boolean);
  return { ok: true, names, detail: "" };
}

async function syncProject(productName: string, envNames: string[], apply: boolean) {
  assertSafeIdentifier(productName, "Project name");
  for (const envName of envNames) assertSafeEnvName(envName);

  const cwd = path.join(workspaceRoot, productName.replace(/[^a-z0-9_.-]+/gi, "-"));
  await fs.mkdir(cwd, { recursive: true });

  const link = await run(vercelCommand, ["link", "--yes", "--project", productName, "--scope", scope], cwd);
  if (link.code !== 0) {
    return { project: productName, ok: false, changed: [] as string[], detail: link.stderr || link.stdout };
  }

  const listed = await listEnvNames(cwd);
  if (!listed.ok) {
    return { project: productName, ok: false, changed: [] as string[], detail: listed.detail };
  }

  const existingNames = new Set(listed.names);
  const changed: string[] = [];
  const wouldChange: string[] = [];

  for (const envName of envNames) {
    const secret = getGroqSecret(envName);
    if (!secret) {
      return { project: productName, ok: false, changed, detail: `${envName} is not present in the local process environment.` };
    }

    const action = existingNames.has(envName) ? "overwrite" : "add";
    wouldChange.push(`${action}:${envName}`);
    if (!apply) continue;

    const added = await run(
      vercelCommand,
      ["env", "add", envName, "production", "--force", "--sensitive", "--yes", "--scope", scope],
      cwd,
      `${secret}\n`,
      [secret],
    );
    if (added.code !== 0) {
      return { project: productName, ok: false, changed, detail: added.stderr || added.stdout };
    }
    changed.push(envName);
  }

  return { project: productName, ok: true, changed: apply ? changed : wouldChange, detail: listed.detail };
}

async function main() {
  const apply = readBoolean("apply");
  const limit = readPositiveInt("limit", 0);
  const envNames = readCsvArg("names", defaultEnvNames);
  const candidates = candidateProducts();
  const selected = limit > 0 ? candidates.slice(0, limit) : candidates;
  const results = [];

  for (const product of selected) {
    const result = await syncProject(product.name, envNames, apply);
    results.push(result);
    console.log(JSON.stringify({ event: apply ? "groq-env-sync" : "groq-env-plan", ...result }));
  }

  console.log(
    JSON.stringify(
      {
        event: "groq-env-complete",
        mode: apply ? "apply" : "dry-run",
        checked: selected.length,
        ok: results.filter((result) => result.ok).length,
        failed: results.filter((result) => !result.ok).length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "groq-env-failed", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
