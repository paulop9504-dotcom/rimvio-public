#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const LEARNING_DIR = path.join(REPO, "lib/learning");
const SURFACE_DIR = path.join(REPO, "lib/surface-engine");
const CAPABILITY_DIR = path.join(REPO, "lib/capability-registry");

const LEARNING_FORBIDDEN = [
  { pattern: /appendCanonicalEvent\s*\(/, label: "event SSOT mutation" },
  { pattern: /from\s+["']@\/lib\/events\/event-store/, label: "event-store import" },
  { pattern: /enqueueExecution\s*\(/, label: "execution enqueue from learning" },
  { pattern: /runExecutionJob\s*\(/, label: "execution run from learning" },
  { pattern: /dispatchCapability\s*\(/, label: "capability dispatch from learning" },
  { pattern: /buildSurfacesFromLife\s*\(/, label: "surface composition from learning" },
  { pattern: /rankSurfaces\s*\(/, label: "surface ranking from learning" },
];

const SURFACE_ALLOWED_LEARNING = "@/lib/learning/surface-weight-adapter";

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
    if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
}

const violations: string[] = [];

const learningFiles: string[] = [];
walk(LEARNING_DIR, learningFiles);
for (const file of learningFiles) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  if (rel.endsWith("surface-weight-adapter.ts")) {
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  if (/from\s+["']@\/lib\/surface-engine/.test(source) && !rel.includes("surface-weight-adapter")) {
    violations.push(`${rel}: surface-engine import outside adapter`);
  }
  if (/observation-stream/.test(source) && /execution-history/.test(source)) {
    violations.push(`${rel}: raw execution history read`);
  }
  for (const rule of LEARNING_FORBIDDEN) {
    if (rule.pattern.test(source)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
}

const surfaceFiles: string[] = [];
walk(SURFACE_DIR, surfaceFiles);
for (const file of surfaceFiles) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf8");
  const learningImports = source.match(/from\s+["']@\/lib\/learning[^"']*["']/g) ?? [];
  for (const imp of learningImports) {
    if (!imp.includes(SURFACE_ALLOWED_LEARNING)) {
      violations.push(`${rel}: learning import must be surface-weight-adapter only (${imp})`);
    }
  }
  if (/listObservations\s*\(/.test(source) || /listExecutionHistory\s*\(/.test(source)) {
    violations.push(`${rel}: raw observation/execution log access`);
  }
  if (/ingestObservation\s*\(/.test(source) || /processObservation\s*\(/.test(source)) {
    violations.push(`${rel}: learning write path from surface engine`);
  }
}

const capabilityFiles: string[] = [];
walk(CAPABILITY_DIR, capabilityFiles);
for (const file of capabilityFiles) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf8");
  if (/from\s+["']@\/lib\/learning/.test(source)) {
    violations.push(`${rel}: capability registry must not import learning`);
  }
}

assert.ok(fs.existsSync(path.join(LEARNING_DIR, "learning-engine.ts")));

if (violations.length > 0) {
  console.error("[learning-boundary] violations:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

console.log(`[learning-boundary] OK — learning ${learningFiles.length}, surface ${surfaceFiles.length} files`);
process.exit(0);
