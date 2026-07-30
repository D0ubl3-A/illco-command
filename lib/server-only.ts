/**
 * Runtime guard for modules that must never execute in a browser bundle.
 *
 * This intentionally avoids a runtime dependency on the `server-only` marker
 * package so Node's native test runner can load server modules in CI. Next.js
 * still tree-shakes and separates server modules through normal import
 * boundaries, while this guard fails closed if the module is evaluated in a
 * browser-like environment.
 */
if (typeof window !== "undefined") {
  throw new Error("This module is server-only and cannot execute in a browser");
}

export {};
