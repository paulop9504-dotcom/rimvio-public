#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCAN = [
  "components",
  "hooks",
  "lib/surface-engine",
  "lib/capability-registry",
].map((s) => path.join(REPO, s));

const FORBIDDEN = [
  { pattern: /kakaomap:\/\//i, label: "kakao scheme outside adapters" },
  { pattern: /buildKakaoMapSearchHref\s*\(/, label: "kakao url builder outside adapters" },
  { pattern: /buildNavigateKakao\s*\(/, label: "navigate builder outside adapters" },
  { pattern: /runExecutionJob\s*\(/, label: "execution run outside allowed UI paths" },
  { pattern: /enqueueExecution\s*\(/, label: "enqueue outside execution plane" },
];

const ALLOW_RUN = [
  "hooks/use-capability-dispatch.ts",
  "components/action-chat/inline-chat-action-chip.tsx",
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
for (const root of SCAN) {
  walk(root, files);
}

for (const file of files) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  if (rel.startsWith("lib/execution/")) {
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const rule of FORBIDDEN) {
    if (
      rule.label === "execution run outside allowed UI paths" &&
      ALLOW_RUN.includes(rel)
    ) {
      continue;
    }
    if (rule.label.includes("enqueue") && rel === "lib/execution/submit-capability-execution.ts") {
      continue;
    }
    if (rule.pattern.test(source)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
}

const adapterDir = path.join(REPO, "lib/execution/adapters");
for (const entry of fs.readdirSync(adapterDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".ts")) {
    continue;
  }
  if (entry.name === "apply-uri.ts") {
    continue;
  }
  const source = fs.readFileSync(path.join(adapterDir, entry.name), "utf8");
  if (/from\s+["']@\/lib\/capability-registry\/internal/.test(source)) {
    violations.push(`lib/execution/adapters/${entry.name}: capability internal import`);
  }
}

assert.ok(fs.existsSync(path.join(REPO, "lib/execution/execution-engine.ts")));

if (violations.length > 0) {
  console.error("[execution-boundary] violations:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

console.log(`[execution-boundary] OK — ${files.length} files`);
process.exit(0);
