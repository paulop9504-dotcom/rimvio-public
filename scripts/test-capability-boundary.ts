#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_ROOTS = [
  "components",
  "hooks",
  "lib/surface-engine",
  "lib/capability-registry",
].map((segment) => path.join(REPO, segment));

const FORBIDDEN = [
  { pattern: /kakaot:\/\//i, label: "kakao deeplink literal" },
  { pattern: /kakaomap:\/\//i, label: "kakao map scheme literal" },
  { pattern: /nmap:\/\//i, label: "naver map scheme literal" },
  { pattern: /@\/lib\/action-dispatcher\/registry/, label: "action-dispatcher registry import" },
  { pattern: /@\/lib\/resolvers\/deep-links/, label: "deep-links resolver import" },
  { pattern: /@\/lib\/resolvers\/kakao/, label: "kakao resolver import" },
  { pattern: /buildKakaoMapSearchHref\s*\(/, label: "kakao map builder call" },
  { pattern: /buildNaverMapSearchWebHref\s*\(/, label: "naver map builder call" },
  { pattern: /resolveCapabilityProvider\s*\(/, label: "provider resolution outside registry" },
  { pattern: /dispatchCapability\s*\(/, label: "capability dispatch outside allowed paths" },
];

const ALLOW_DISPATCH = [
  "lib/capability-registry/capability-dispatcher.ts",
  "hooks/use-capability-dispatch.ts",
  "components/action-chat-feed.tsx",
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
for (const root of SCAN_ROOTS) {
  walk(root, files);
}

for (const file of files) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  if (rel.startsWith("lib/capability-registry/") && !rel.includes("/internal/")) {
    /* capability-registry scanned for provider leaks */
  }
  const source = fs.readFileSync(file, "utf8");

  for (const rule of FORBIDDEN) {
    if (rule.label === "provider resolution outside registry") {
      if (rel.startsWith("lib/capability-registry/")) {
        continue;
      }
      if (rule.pattern.test(source)) {
        violations.push(`${rel}: ${rule.label}`);
      }
      continue;
    }
    if (rule.label === "capability dispatch outside allowed paths") {
      if (rule.pattern.test(source) && !ALLOW_DISPATCH.includes(rel)) {
        violations.push(`${rel}: ${rule.label}`);
      }
      continue;
    }
    if (rule.pattern.test(source)) {
      violations.push(`${rel}: ${rule.label}`);
    }
  }
}

const registryDir = path.join(REPO, "lib/capability-registry");
if (fs.existsSync(path.join(registryDir, "internal", "provider-urls.ts"))) {
  violations.push("lib/capability-registry/internal/provider-urls.ts: must not exist (moved to execution adapters)");
}

assert.ok(fs.existsSync(path.join(REPO, "lib/capability-registry/capability-dispatcher.ts")));

if (violations.length > 0) {
  console.error("[capability-boundary] violations:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

console.log(`[capability-boundary] OK — ${files.length} files`);
process.exit(0);
