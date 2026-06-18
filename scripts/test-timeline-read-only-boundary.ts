#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TIMELINE_FORBIDDEN_IMPORTER_PREFIXES,
  TIMELINE_FORBIDDEN_WRITE_SYMBOLS,
} from "../lib/timeline-projection/timeline-layer-contract";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib");
const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

function scanTimelineWrites() {
  const dir = path.join(ROOT, "timeline-projection");
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }
    if (entry.name === "timeline-layer-contract.ts") {
      continue;
    }
    const source = fs.readFileSync(path.join(dir, entry.name), "utf8");
    for (const symbol of TIMELINE_FORBIDDEN_WRITE_SYMBOLS) {
      if (source.includes(symbol)) {
        fail(`timeline-projection/${entry.name}:${symbol}`);
      }
    }
  }
}

function scanForbiddenImporters() {
  const checkDirs = [
    "opportunity-engine",
    "behavior-engine",
    "notification-shadow",
    "schedule",
    "source-of-truth",
    "events/event-ingest-pipeline.ts",
  ];

  for (const rel of checkDirs) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      continue;
    }
    const files: string[] = [];
    if (fs.statSync(full).isFile()) {
      files.push(full);
    } else {
      const walk = (current: string) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const p = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(p);
          } else if (entry.name.endsWith(".ts")) {
            files.push(p);
          }
        }
      };
      walk(full);
    }
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      if (
        source.includes("@/lib/timeline-projection") ||
        source.includes("timeline-projection/list-timeline")
      ) {
        fail(`forbidden_importer:${path.relative(ROOT, file)}`);
      }
    }
  }
}

function scanActionProjectionDoesNotUseTimelineList() {
  const source = fs.readFileSync(
    path.join(ROOT, "action-projection", "compose-action-projection.ts"),
    "utf8",
  );
  if (source.includes("listTimelineProjectionFromStore")) {
    fail("action-projection must not call listTimelineProjectionFromStore");
  }
  if (source.includes("@/lib/events/event-store")) {
    fail("action-projection must not import event-store");
  }
  if (!source.includes("readSurface")) {
    fail("action-projection must read via readSurface (life-read-model)");
  }
}

function scanScheduleAndDockNoTimelineImport() {
  for (const rel of ["schedule", "dock-feed", "predictive-dock"]) {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) {
      continue;
    }
    const walk = (current: string) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const p = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(p);
        } else if (entry.name.endsWith(".ts")) {
          const source = fs.readFileSync(p, "utf8");
          if (source.includes("listTimelineProjectionFromStore")) {
            fail(`${rel} must not import timeline list:${path.relative(ROOT, p)}`);
          }
        }
      }
    };
    walk(dir);
  }
}

scanTimelineWrites();
scanForbiddenImporters();
scanActionProjectionDoesNotUseTimelineList();
scanScheduleAndDockNoTimelineImport();

assert.ok(TIMELINE_FORBIDDEN_IMPORTER_PREFIXES.length >= 5);

if (violations.length > 0) {
  console.error("test-timeline-read-only-boundary failures:");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log("test-timeline-read-only-boundary: ok");
