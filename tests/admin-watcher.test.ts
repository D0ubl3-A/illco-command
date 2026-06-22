import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminPageSource = readFileSync("app/admin/page.tsx", "utf8");
const adminActionsSource = readFileSync("app/admin/actions.ts", "utf8");
const adminClientSource = readFileSync("components/admin-client.tsx", "utf8");

test("admin watcher target survives admin login options", () => {
  assert.match(adminPageSource, /adminPanelReturnTo\(panel\)/);
  assert.match(adminPageSource, /\/admin\?panel=watcher#watcher/);
  assert.match(adminPageSource, /encodeURIComponent\(returnTo\)/);
  assert.match(adminPageSource, /name="returnTo" value=\{returnTo\}/);
  assert.match(adminActionsSource, /type AdminReturnTo = "\/admin" \| "\/admin\?panel=watcher#watcher";/);
  assert.match(adminActionsSource, /raw === "\/admin\?panel=watcher#watcher"/);
});

test("admin client scrolls the watcher panel when requested", () => {
  assert.match(adminClientSource, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(adminClientSource, /searchParams\.get\("panel"\) !== "watcher"/);
  assert.match(adminClientSource, /getElementById\("watcher"\)\?\.scrollIntoView/);
});