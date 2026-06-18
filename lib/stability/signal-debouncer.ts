import type { StreamSignal, StreamSignalKind } from "@/lib/realtime/realtime-contract";

export type DebouncerConfig = {
  windowMs: number;
  maxBucketStrength: number;
};

export const DEFAULT_DEBOUNCER_CONFIG: DebouncerConfig = {
  windowMs: 3000,
  maxBucketStrength: 1,
};

const COMPRESSIBLE_KINDS: readonly StreamSignalKind[] = [
  "navigate_pulse",
  "map_search_pulse",
  "touch_activity",
  "notification_burst",
  "message_burst",
  "gps_movement_pulse",
  "idle_tick",
];

type Bucket = {
  kind: StreamSignalKind;
  category: StreamSignal["category"];
  firstAtMs: number;
  lastAtMs: number;
  maxStrength: number;
  count: number;
};

let buckets = new Map<StreamSignalKind, Bucket>();
let debounceCounter = 0;

function isCompressible(kind: StreamSignalKind): boolean {
  return COMPRESSIBLE_KINDS.includes(kind);
}

function bucketKey(kind: StreamSignalKind): StreamSignalKind {
  return kind;
}

/**
 * Merge duplicate / high-frequency signals into weighted intents.
 * 10 NAVIGATE pulses in 3s → one navigate_pulse at merged strength.
 */
export function pushSignalThroughDebouncer(
  signal: StreamSignal,
  nowMs: number,
  config: DebouncerConfig = DEFAULT_DEBOUNCER_CONFIG,
): { compressed: StreamSignal | null; passthrough: StreamSignal | null } {
  if (!isCompressible(signal.kind)) {
    return { compressed: null, passthrough: signal };
  }

  const key = bucketKey(signal.kind);
  const existing = buckets.get(key);
  if (!existing || nowMs - existing.firstAtMs > config.windowMs) {
    buckets.set(key, {
      kind: signal.kind,
      category: signal.category,
      firstAtMs: nowMs,
      lastAtMs: nowMs,
      maxStrength: signal.strength,
      count: 1,
    });
    return { compressed: null, passthrough: null };
  }

  existing.lastAtMs = nowMs;
  existing.count += 1;
  existing.maxStrength = Math.max(existing.maxStrength, signal.strength);
  return { compressed: null, passthrough: null };
}

function emitBucket(kind: StreamSignalKind, bucket: Bucket, nowMs: number, config: DebouncerConfig): StreamSignal {
  debounceCounter += 1;
  const weight = Math.min(
    config.maxBucketStrength,
    bucket.maxStrength * (1 + Math.log2(1 + bucket.count) * 0.08),
  );
  return {
    signalId: `deb-${kind}-${nowMs}-${debounceCounter}`,
    kind: bucket.kind,
    category: bucket.category,
    timestamp: new Date(nowMs).toISOString(),
    strength: Math.round(weight * 1000) / 1000,
  };
}

/** Flush buckets whose window expired (between ticks). */
export function flushDebouncedSignals(
  nowMs: number,
  config: DebouncerConfig = DEFAULT_DEBOUNCER_CONFIG,
): readonly StreamSignal[] {
  const out: StreamSignal[] = [];

  for (const [kind, bucket] of buckets.entries()) {
    const windowExpired = nowMs - bucket.firstAtMs >= config.windowMs;
    if (!windowExpired) {
      continue;
    }
    out.push(emitBucket(kind, bucket, nowMs, config));
    buckets.delete(kind);
  }

  return out;
}

/** Flush every pending bucket — used at end of each realtime tick. */
export function flushAllDebouncedSignals(
  nowMs: number,
  config: DebouncerConfig = DEFAULT_DEBOUNCER_CONFIG,
): readonly StreamSignal[] {
  const out: StreamSignal[] = [];
  for (const [kind, bucket] of buckets.entries()) {
    out.push(emitBucket(kind, bucket, nowMs, config));
  }
  buckets.clear();
  return out;
}

export function debounceSignalBatch(
  signals: readonly StreamSignal[],
  nowMs: number,
  config: DebouncerConfig = DEFAULT_DEBOUNCER_CONFIG,
): readonly StreamSignal[] {
  const immediate: StreamSignal[] = [];
  for (const row of signals) {
    const { passthrough } = pushSignalThroughDebouncer(row, nowMs, config);
    if (passthrough) {
      immediate.push(passthrough);
    }
  }
  const flushed = flushAllDebouncedSignals(nowMs, config);
  return [...immediate, ...flushed];
}

export function readDebouncerBucketCount(): number {
  return buckets.size;
}

export function resetSignalDebouncerForTests(): void {
  buckets = new Map();
  debounceCounter = 0;
}
