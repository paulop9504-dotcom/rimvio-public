#!/usr/bin/env npx tsx
/**
 * CI guard: UI/display read paths must not import `event-store` directly.
 * Allowed readers: `lib/life-read-model/**` (internal wrapper) + ingest/write allowlist.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_ROOTS = ["lib", "hooks", "components", "app"].map((segment) =>
  path.join(REPO, segment),
);

const IMPORT_RE =
  /from\s+["'](@\/lib\/events\/event-store|\.\.?\/.*event-store)["']|require\s*\(\s*["'][^"']*event-store["']\s*\)/g;

/** Paths relative to repo root (posix). */
const ALLOWLIST: readonly string[] = [
  "lib/events/event-store.ts",
  "lib/life-read-model/",
  "lib/source-of-truth/commit-truth.ts",
  "lib/source-of-truth/hydrate-event-store.ts",
  "lib/events/event-ingest-pipeline.ts",
  "lib/events/notification-ingest.ts",
  "lib/events/chat-scheduled-ingest.ts",
  "lib/events/link-reminder-ingest.ts",
  "lib/events/google-calendar-ingest.ts",
  "lib/events/event-lifecycle-runner.ts",
  "lib/events/normalize-anchor-id.ts",
  "lib/action-event-registry/action-event-store.ts",
  "lib/event-os/ocr-review-flow-setup.ts",
  // Experience OS ingest / seed / resolve (write paths — not UI reads)
  "lib/feed/",
  "lib/ingest/",
  "lib/experience-graph/",
  "lib/experience-bridge/",
  "lib/media-pool/",
  "lib/globe/apply-globe-photo-place-suggestion.ts",
  "lib/globe/globe-orchestrator-scope-bridge.ts",
  "lib/globe/resolve-gathering-trace-hint.ts",
  "lib/globe/resolve-inferred-pin-domain-stub.ts",
  "lib/peer-chat/ai-lens/",
];

function toPosixRel(absPath: string): string {
  return path.relative(REPO, absPath).split(path.sep).join("/");
}

function isAllowlisted(relPosix: string): boolean {
  return ALLOWLIST.some(
    (allowed) =>
      relPosix === allowed ||
      (allowed.endsWith("/") && relPosix.startsWith(allowed)),
  );
}

function walkTsFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") {
        continue;
      }
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
for (const root of SCAN_ROOTS) {
  walkTsFiles(root, files);
}

for (const file of files) {
  const rel = toPosixRel(file);
  if (isAllowlisted(rel)) {
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  const matches = source.match(IMPORT_RE);
  if (matches?.length) {
    violations.push(`${rel} → ${[...new Set(matches)].join(", ")}`);
  }
}

if (violations.length > 0) {
  console.error(
    "[life-read-allowlist] Direct event-store imports are forbidden outside the allowlist:\n" +
      violations.map((line) => `  - ${line}`).join("\n"),
  );
  process.exit(1);
}

const indexPath = path.join(REPO, "lib/life-read-model/index.ts");
const indexSource = fs.readFileSync(indexPath, "utf8");
const exportNames = [...indexSource.matchAll(/export\s+\{\s*([^}]+)\s*\}/g)].flatMap(
  (block) =>
    block[1]
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/)[0]?.trim())
      .filter(Boolean),
);
const fnExports = exportNames.filter((name) => !name.startsWith("type "));
assert.deepEqual(
  fnExports.sort(),
  [
    "EVENT_CANDIDATES_UPDATED",
    "findLifeEventCandidate",
    "listLifeEventCandidates",
    "readLifeProjections",
    "readSurface",
    "subscribeLifeCandidatesUpdated",
  ].sort(),
  "lib/life-read-model/index.ts public read API",
);

console.log(
  `[life-read-allowlist] OK — scanned ${files.length} files, 0 violations`,
);
process.exit(0);
