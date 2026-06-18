#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_DIRS = [
  path.join(REPO, "components"),
  path.join(REPO, "hooks"),
].map((dir) => ({ dir, rel: path.relative(REPO, dir).replace(/\\/g, "/") }));

const FORBIDDEN_IN_UI = [
  { pattern: /buildSurfacesFromLife/, label: "local surface composition" },
  { pattern: /rankSurfaces\s*\(/, label: "local surface ranking" },
  { pattern: /selectPrimaryAction\s*\(/, label: "local primary action selection" },
  { pattern: /composeActionProjection\s*\(/, label: "local action projection compose" },
  { pattern: /listDockFeedFromStore/, label: "local dock feed compose" },
  { pattern: /listTimelineProjectionFromStore/, label: "local timeline compose" },
  { pattern: /listNarrationsFromStore/, label: "local narration compose" },
  { pattern: /computePredictiveDock\s*\(/, label: "local predictive dock compose" },
  { pattern: /listEventCalendarRows\s*\(/, label: "local calendar row compose" },
  { pattern: /buildTieredEventOverlayActions\s*\(/, label: "local tiered overlay compose" },
];

const REQUIRED_HOOK = "use-surface-engine.ts";
const REQUIRED_COMPONENTS = [
  "components/surface/surface-card.tsx",
  "components/surface-composition/surface-composition-runtime.tsx",
  "hooks/use-surface-composition.ts",
];

function walkTsFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(full, out);
      continue;
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
}

const violations: string[] = [];
const files: string[] = [];
for (const { dir } of SCAN_DIRS) {
  walkTsFiles(dir, files);
}

for (const file of files) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  if (rel.startsWith("components/surface/")) {
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const rule of FORBIDDEN_IN_UI) {
    if (rule.pattern.test(source)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
}

assert.ok(
  fs.existsSync(path.join(REPO, "hooks", REQUIRED_HOOK)),
  "missing hooks/use-surface-engine.ts",
);
for (const rel of REQUIRED_COMPONENTS) {
  assert.ok(fs.existsSync(path.join(REPO, rel)), `missing ${rel}`);
}

const feedSource = fs.readFileSync(
  path.join(REPO, "components/action-chat-feed.tsx"),
  "utf8",
);
assert.ok(
  (feedSource.includes("useSurfaceComposition") ||
    feedSource.includes("useRealtimeSurfaceComposition")) ||
    feedSource.includes("SurfaceCompositionRuntime"),
  "feed must use surface composition runtime",
);

const dockHook = fs.readFileSync(path.join(REPO, "hooks/use-predictive-dock.ts"), "utf8");
assert.ok(
  dockHook.includes("surfacesToPredictiveDockWire"),
  "dock hook must map surfaces via engine adapter",
);
assert.ok(!dockHook.includes("computePredictiveDock"), "dock hook must not compose dock locally");

const calendarHook = fs.readFileSync(path.join(REPO, "hooks/use-action-calendar.ts"), "utf8");
assert.ok(
  calendarHook.includes("buildCalendarSnapshotFromSurfaces"),
  "calendar hook must use surface calendar adapter",
);

if (violations.length > 0) {
  console.error("[surface-adoption] UI ownership violations:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

console.log(`[surface-adoption] OK — ${files.length} UI files scanned, integrations verified`);
process.exit(0);
