#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib");

const FORBIDDEN_WRITE = [
  "upsertEventCandidate",
  "transitionEventLifecycle",
  "writeEventCandidatesRaw",
  "ingestScheduleSignal",
  "ingestConfirmationSignal",
  "ingestCompletionSignal",
  "commitEventUpsert",
  "commitEventLifecycle",
];

function scanDir(relDir: string, allowCommit = false): string[] {
  const dir = path.join(ROOT, relDir);
  const hits: string[] = [];
  const patterns = allowCommit
    ? FORBIDDEN_WRITE.filter((p) => !p.startsWith("commitEvent"))
    : FORBIDDEN_WRITE;

  function walk(current: string) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".ts")) {
        continue;
      }
      if (entry.name === "timeline-layer-contract.ts") {
        continue;
      }
      const source = fs.readFileSync(full, "utf8");
      for (const pattern of patterns) {
        if (source.includes(pattern)) {
          hits.push(`${path.relative(ROOT, full)}:${pattern}`);
        }
      }
    }
  }

  walk(dir);
  return hits;
}

const goalHits = scanDir("goal-engine");
assert.equal(
  goalHits.length,
  0,
  `goal-engine must not touch event write APIs: ${goalHits.join(", ")}`,
);

const scheduleHits = scanDir("schedule");
assert.equal(
  scheduleHits.length,
  0,
  `schedule must be projection-only: ${scheduleHits.join(", ")}`,
);

const timelineHits = scanDir("timeline-projection");
assert.equal(
  timelineHits.length,
  0,
  `timeline-projection must be diff-only reads: ${timelineHits.join(", ")}`,
);

const commitTruth = fs.readFileSync(
  path.join(ROOT, "source-of-truth", "commit-truth.ts"),
  "utf8",
);
assert.ok(commitTruth.includes("commitEventUpsert"));
assert.ok(commitTruth.includes("storeUpsert"));

console.log("test-write-path-boundary: ok");
