#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOOP_DIR = path.join(REPO, "lib/loop-wiring");

const FORBIDDEN = [
  { pattern: /appendCanonicalEvent\s*\(/, label: "event SSOT write" },
  { pattern: /buildSurfacesFromLife/, label: "surface composition in loop wiring" },
  { pattern: /enqueueExecution\s*\(/, label: "execution enqueue in loop wiring" },
  { pattern: /processObservation\s*\(/, label: "learning write in loop wiring" },
];

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
}

const violations: string[] = [];
const files: string[] = [];
walk(LOOP_DIR, files);

for (const file of files) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(source)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
}

assert.ok(fs.existsSync(path.join(LOOP_DIR, "loop-wiring-engine.ts")));
assert.ok(fs.existsSync(path.join(LOOP_DIR, "loop-priority-engine.ts")));

if (violations.length > 0) {
  console.error("[loop-wiring-boundary] violations:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

console.log(`[loop-wiring-boundary] OK — ${files.length} files`);
process.exit(0);
