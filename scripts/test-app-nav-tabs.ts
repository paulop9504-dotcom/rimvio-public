#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const appNav = readFileSync(join(process.cwd(), "components/app-nav.tsx"), "utf8");
const globals = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

const hrefs = [...appNav.matchAll(/href:\s*"([^"]+)"/g)]
  .map((match) => match[1])
  .filter((href) => href.startsWith("/"));

assert.equal(hrefs.length, 4, `expected 4 nav tabs, got ${hrefs.length}: ${hrefs.join(", ")}`);
assert.ok(!hrefs.includes("/calendar"), "calendar tab must be removed from app nav");
assert.ok(!hrefs.includes("/globe"), "globe tab must be removed from app nav");
assert.ok(!appNav.includes("Globe2"), "Globe2 icon import must be removed");
assert.ok(
  appNav.includes('data-nav-href') && appNav.includes("<button"),
  "nav tabs must use button controls for reliable touch",
);
assert.ok(
  globals.includes("repeat(4, minmax(0, 1fr))"),
  "bottom nav grid must be 4 columns",
);
assert.ok(
  appNav.includes("window.location.assign"),
  "mobile nav must hard-navigate for iOS/PWA tap reliability",
);
assert.ok(
  appNav.includes("createPortal(bar, document.body)"),
  "bottom nav must portal directly to document.body",
);

console.log("test-app-nav-tabs: ok", hrefs.join(", "));
