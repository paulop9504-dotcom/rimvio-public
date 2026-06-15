#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const UI_DIRS = ["components", "hooks"].map((segment) => path.join(REPO, segment));

const FORBIDDEN = [
  { pattern: /buildSurfacesFromLife/, label: "local surface composition" },
  { pattern: /rankSurfaces\s*\(/, label: "local surface ranking" },
  { pattern: /buildSurfaceGraph\s*\(/, label: "buildSurfaceGraph outside composition hook/lib" },
  { pattern: /from\s+["']@\/lib\/learning/, label: "learning layer import in UI" },
  { pattern: /listObservations\s*\(/, label: "raw learning observation access" },
];

const ALLOW_BUILD_GRAPH = [
  "hooks/use-surface-composition.ts",
  "components/surface/surface-feed-strip.tsx",
];

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") {
        continue;
      }
      walk(full, out);
      continue;
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
}

const violations: string[] = [];
const files: string[] = [];
for (const dir of UI_DIRS) {
  walk(dir, files);
}

for (const file of files) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  if (rel.startsWith("lib/surface-composition/")) {
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.label === "buildSurfaceGraph outside composition hook/lib") {
      if (rule.pattern.test(source) && !ALLOW_BUILD_GRAPH.includes(rel)) {
        violations.push(`${rel}: ${rule.label}`);
      }
      continue;
    }
    if (rel.startsWith("components/surface-composition/")) {
      if (
        rule.label === "local surface composition" ||
        rule.label === "local surface ranking"
      ) {
        continue;
      }
    }
    if (rule.pattern.test(source)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
  if (rel.startsWith("components/surface-composition/micro-frontends/")) {
    const crossMfe =
      /from\s+["']@\/components\/surface-composition\/micro-frontends\/(start-here|intent-merged|surface-stack)-surface-mf/.test(
        source,
      );
    if (crossMfe && rel !== "components/surface-composition/micro-frontends/mfe-renderer.tsx") {
      violations.push(`${rel}: cross-MFE direct import`);
    }
  }
}

const feed = fs.readFileSync(path.join(REPO, "components/action-chat-feed.tsx"), "utf8");
assert.ok(
  feed.includes("useSurfaceComposition") || feed.includes("SurfaceCompositionRuntime"),
  "feed must use composition runtime",
);
assert.ok(!feed.includes("buildSurfacesFromLife"), "feed must not compose surfaces");

if (violations.length > 0) {
  console.error(
    "[surface-composition-boundary] violations:\n" +
      violations.map((v) => `  - ${v}`).join("\n"),
  );
  process.exit(1);
}

console.log(`[surface-composition-boundary] OK — ${files.length} files`);
process.exit(0);
