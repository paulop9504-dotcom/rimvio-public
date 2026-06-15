import { DAILY_DECAY_FACTOR } from "@/lib/product-self-learning/types";

export function daysSince(timestamp: string, now: Date): number {
  const then = Date.parse(timestamp);
  if (!Number.isFinite(then)) {
    return 0;
  }
  return Math.max(0, (now.getTime() - then) / 86_400_000);
}

/** Older events contribute less — weight × 0.95 daily. */
export function decayMultiplier(timestamp: string, now: Date): number {
  const days = daysSince(timestamp, now);
  return Math.pow(DAILY_DECAY_FACTOR, days);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}
