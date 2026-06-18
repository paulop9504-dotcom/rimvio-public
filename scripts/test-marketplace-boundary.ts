#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKET_DIR = path.join(REPO, "lib/marketplace");
const BRIDGE = path.join(MARKET_DIR, "internal/marketplace-bridge.ts");

const CORE_IMPORT =
  /from\s+["']@\/lib\/(surface-engine|loop-wiring|learning|stability|realtime|execution|capability-registry)/;

const FORBIDDEN = [
  { pattern: /appendCanonicalEvent\s*\(/, label: "event SSOT write" },
  { pattern: /from\s+["']@\/lib\/events\/event-store/, label: "direct event-store import" },
  { pattern: /Math\.random\s*\(/, label: "non-deterministic random" },
];

function walk(dir: string, out: string[], skipInternal = true): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipInternal && entry.name === "internal") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out, false);
      continue;
    }
    if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
}

const violations: string[] = [];
const publicFiles: string[] = [];
walk(MARKET_DIR, publicFiles);

for (const file of publicFiles) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf8");
  if (CORE_IMPORT.test(source) && !rel.includes("marketplace-test-fixtures")) {
    violations.push(`${rel}: core import outside marketplace bridge`);
  }
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(source)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
}

assert.ok(fs.existsSync(BRIDGE));
const bridgeSource = fs.readFileSync(BRIDGE, "utf8");
assert.ok(CORE_IMPORT.test(bridgeSource), "marketplace bridge must reach core");

if (violations.length > 0) {
  console.error("[marketplace-boundary] violations:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

console.log(`[marketplace-boundary] OK — ${publicFiles.length} public files`);
process.exit(0);
