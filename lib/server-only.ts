const runtimeGlobal = globalThis as typeof globalThis & { window?: unknown };

if ("window" in runtimeGlobal) {
  throw new Error("This module can only be imported from server-side code.");
}

export {};
