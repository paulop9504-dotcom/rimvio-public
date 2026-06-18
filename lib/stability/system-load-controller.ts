import type { SystemLoadLevel } from "@/lib/stability/stability-contract";

export type LoadMetrics = {
  ingestPerSecond: number;
  loopSwitchesPer10s: number;
  recomposesPer10s: number;
  pressure: number;
};

type Timestamped = { atMs: number };

let ingestEvents: Timestamped[] = [];
let switchEvents: Timestamped[] = [];
let recomposeEvents: Timestamped[] = [];

export function recordSignalIngest(nowMs = Date.now()): void {
  ingestEvents.push({ atMs: nowMs });
  prune(ingestEvents, nowMs, 1000);
}

export function recordSignalIngestBatch(count: number, nowMs = Date.now()): void {
  for (let index = 0; index < count; index += 1) {
    ingestEvents.push({ atMs: nowMs });
  }
  prune(ingestEvents, nowMs, 1000);
}

export function recordLoopSwitch(nowMs = Date.now()): void {
  switchEvents.push({ atMs: nowMs });
  prune(switchEvents, nowMs, 10_000);
}

export function recordSurfaceRecompose(nowMs = Date.now()): void {
  recomposeEvents.push({ atMs: nowMs });
  prune(recomposeEvents, nowMs, 10_000);
}

function prune(bucket: Timestamped[], nowMs: number, windowMs: number): void {
  const cutoff = nowMs - windowMs;
  while (bucket.length > 0 && bucket[0]!.atMs < cutoff) {
    bucket.shift();
  }
}

export function computeLoadMetrics(nowMs = Date.now()): LoadMetrics {
  prune(ingestEvents, nowMs, 1000);
  prune(switchEvents, nowMs, 10_000);
  prune(recomposeEvents, nowMs, 10_000);

  const ingestPerSecond = ingestEvents.length;
  const loopSwitchesPer10s = switchEvents.length;
  const recomposesPer10s = recomposeEvents.length;

  let pressure = 0;
  pressure += Math.min(1, ingestPerSecond / 100) * 0.45;
  pressure += Math.min(1, loopSwitchesPer10s / 6) * 0.3;
  pressure += Math.min(1, recomposesPer10s / 24) * 0.25;

  return {
    ingestPerSecond,
    loopSwitchesPer10s,
    recomposesPer10s,
    pressure: Math.round(pressure * 1000) / 1000,
  };
}

export function resolveLoadLevel(metrics: LoadMetrics): SystemLoadLevel {
  if (metrics.ingestPerSecond >= 100 || metrics.pressure >= 0.92) {
    return "CRITICAL";
  }
  if (metrics.ingestPerSecond >= 60 || metrics.pressure >= 0.72) {
    return "HIGH";
  }
  if (metrics.ingestPerSecond >= 30 || metrics.pressure >= 0.45) {
    return "MEDIUM";
  }
  return "LOW";
}

export function resetSystemLoadControllerForTests(): void {
  ingestEvents = [];
  switchEvents = [];
  recomposeEvents = [];
}
