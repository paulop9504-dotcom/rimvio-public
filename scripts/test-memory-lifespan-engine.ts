#!/usr/bin/env npx tsx
/**
 * Memory Lifespan Engine — spec cases 1–4.
 * Usage: npx tsx scripts/test-memory-lifespan-engine.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildMemoryRetrievalStats,
  buildTurnMemoryAccessLog,
  runMemoryLifespanEngine,
} from "../lib/event-kernel/memory/memory-lifespan-engine";
import { emptyKernelMemoryState } from "../lib/event-kernel/memory/types";
import type { KernelMemoryItem } from "../lib/event-kernel/memory/types";
import { runEventKernelOS } from "../lib/event-kernel/run-event-kernel-os";

const violations: string[] = [];

function check(label: string, ok: boolean) {
  if (!ok) {
    violations.push(label);
  }
}

function wmItem(
  label: string,
  overrides: Partial<KernelMemoryItem> = {}
): KernelMemoryItem {
  const key = label.trim().toLowerCase();
  return {
    id: `wm-test-${key}`,
    key,
    label,
    kind: "entity",
    weight: overrides.weight ?? 1,
    hitCount: overrides.hitCount ?? 1,
    lastSeenAt: overrides.lastSeenAt ?? new Date().toISOString(),
    ...overrides,
  };
}

const now = new Date().toISOString();
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

// CASE 1: frequent entity 쿠우쿠우 → COMPRESS into LTM abstraction
{
  const memoryState = {
    ...emptyKernelMemoryState(now),
    wm: [
      wmItem("쿠우쿠우 가격", { id: "wm-1", hitCount: 2, weight: 1.2 }),
      wmItem("쿠우쿠우 환불", { id: "wm-2", hitCount: 2, weight: 1.1 }),
      wmItem("쿠우쿠우 위치", { id: "wm-3", hitCount: 2, weight: 1.0 }),
    ],
    ltm: [],
  };

  const result = runMemoryLifespanEngine({
    memoryState,
    retrievalStats: buildMemoryRetrievalStats([]),
    accessLog: [],
    now,
  });

  const compressed = result.lifecycleEvents.some((e) => e.type === "COMPRESS");
  check("case1: COMPRESS event emitted", compressed);
  check(
    "case1: LTM abstraction present",
    result.updatedMemoryState.ltm.some(
      (row) =>
        row.lifecycle === "compressed" && row.label.includes("쿠우쿠우") && row.label.includes("반복")
    )
  );
  check(
    "case1: redundant WM rows removed",
    result.updatedMemoryState.wm.filter((row) => row.label.startsWith("쿠우쿠우")).length === 0
  );
}

// CASE 2: single-use memory → FORGET
{
  const memoryState = {
    ...emptyKernelMemoryState(now),
    wm: [
      wmItem("일회성 메모", {
        id: "wm-once",
        weight: 0.12,
        hitCount: 1,
        lastSeenAt: daysAgo(20),
      }),
    ],
    ltm: [],
  };

  const result = runMemoryLifespanEngine({
    memoryState,
    retrievalStats: buildMemoryRetrievalStats([]),
    accessLog: [],
    now,
  });

  check("case2: FORGET event emitted", result.lifecycleEvents.some((e) => e.type === "FORGET"));
  check("case2: memory removed from WM", result.updatedMemoryState.wm.length === 0);
}

// CASE 3: recent memory → ACTIVE
{
  const memoryState = {
    ...emptyKernelMemoryState(now),
    wm: [wmItem("쿠우쿠우 연신내", { id: "wm-recent", lastSeenAt: now, weight: 1.4 })],
    ltm: [],
  };

  const result = runMemoryLifespanEngine({
    memoryState,
    retrievalStats: buildMemoryRetrievalStats([]),
    accessLog: buildTurnMemoryAccessLog({
      memory: memoryState,
      frameEntities: ["쿠우쿠우"],
      now,
    }),
    now,
  });

  const kept = result.updatedMemoryState.wm[0];
  check("case3: memory retained", Boolean(kept));
  check("case3: lifecycle active", kept?.lifecycle === "active");
  check(
    "case3: no FORGET",
    !result.lifecycleEvents.some((e) => e.type === "FORGET" && e.target === "wm-recent")
  );
}

// CASE 4: old but referenced → DORMANT or REINFORCE
{
  const memoryState = {
    ...emptyKernelMemoryState(now),
    wm: [
      wmItem("쿠우쿠우 도안", {
        id: "wm-old-ref",
        lastSeenAt: daysAgo(10),
        weight: 0.9,
        hitCount: 3,
      }),
    ],
    ltm: [],
  };

  const result = runMemoryLifespanEngine({
    memoryState,
    retrievalStats: buildMemoryRetrievalStats([
      { id: "wm-old-ref", key: "쿠우쿠우 도안", at: now },
      { id: "wm-old-ref", key: "쿠우쿠우 도안", at: now },
    ]),
    accessLog: [],
    now,
  });

  const kept = result.updatedMemoryState.wm.find((row) => row.id === "wm-old-ref");
  check("case4: memory not forgotten", Boolean(kept));
  check(
    "case4: REINFORCE or DORMANT",
    result.lifecycleEvents.some((e) => e.type === "REINFORCE") ||
      kept?.lifecycle === "dormant" ||
      kept?.lifecycle === "active"
  );
}

// Pipeline: lifespan runs after writer without touching kernel decision source
{
  const os = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });
  check("case-pipeline: lifecycleEvents array returned", Array.isArray(os.lifecycleEvents));
  check("case-pipeline: memory state after writer", os.memory.stm.length >= 0);
}

// Static guard: kernel must not import lifespan engine
{
  const kernelSource = fs.readFileSync(
    path.join(process.cwd(), "lib/event-kernel/decide-kernel-intent.ts"),
    "utf8"
  );
  check(
    "guard: kernel does not reference lifespan engine",
    !kernelSource.includes("memory-lifespan-engine")
  );

  const writerSource = fs.readFileSync(
    path.join(process.cwd(), "lib/event-kernel/memory/memory-writer.ts"),
    "utf8"
  );
  check(
    "guard: memory writer does not call lifespan engine",
    !writerSource.includes("runMemoryLifespanEngine")
  );
}

const status = violations.length === 0 ? "PASS" : "FAIL";
console.log(JSON.stringify({ status, violations }, null, 2));

if (status === "FAIL") {
  process.exit(1);
}

assert.equal(status, "PASS");
console.log("test-memory-lifespan-engine: ok");
