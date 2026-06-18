#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORM_DIR = path.join(REPO, "lib/platform");
const BRIDGE_FILE = path.join(PLATFORM_DIR, "internal/engine-bridge.ts");

const CORE_IMPORT =
  /from\s+["']@\/lib\/(surface-engine|loop-wiring|learning|stability|realtime|execution|capability-registry)/;

const FORBIDDEN_IN_PLATFORM = [
  { pattern: /appendCanonicalEvent\s*\(/, label: "event SSOT write" },
  { pattern: /from\s+["']@\/lib\/events\/event-store/, label: "direct event-store import" },
];

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "internal") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
}

function walkInternal(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkInternal(full, out);
      continue;
    }
    if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
}

const violations: string[] = [];
const publicFiles: string[] = [];
walk(PLATFORM_DIR, publicFiles);

for (const file of publicFiles) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf8");
  if (CORE_IMPORT.test(source) && !rel.includes("platform-test-fixtures")) {
    violations.push(`${rel}: core engine import outside bridge`);
  }
  for (const rule of FORBIDDEN_IN_PLATFORM) {
    if (rule.pattern.test(source)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
}

const internalFiles: string[] = [];
walkInternal(path.join(PLATFORM_DIR, "internal"), internalFiles);
let bridgeImportsCore = false;
for (const file of internalFiles) {
  const source = fs.readFileSync(file, "utf8");
  if (CORE_IMPORT.test(source)) {
    bridgeImportsCore = true;
  }
}

assert.ok(fs.existsSync(BRIDGE_FILE));
assert.ok(bridgeImportsCore, "engine-bridge must import core engines");

if (violations.length > 0) {
  console.error(
    "[platform-boundary] violations:\n" + violations.map((v) => `  - ${v}`).join("\n"),
  );
  process.exit(1);
}

console.log(`[platform-boundary] OK — ${publicFiles.length} public files, bridge enforced`);
process.exit(0);
