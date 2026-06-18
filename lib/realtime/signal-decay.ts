import type { SignalCategory } from "@/lib/loop-wiring/loop-contract";

/** Half-life ms — behavioral fast, system medium, location slow. */
export const SIGNAL_DECAY_HALF_LIFE_MS: Record<SignalCategory, number> = {
  behavior: 2 * 60 * 1000,
  system: 8 * 60 * 1000,
  location: 20 * 60 * 1000,
  time: 60 * 60 * 1000,
};

export function decayedStrength(
  baseStrength: number,
  ingestedAtMs: number,
  nowMs: number,
  category: SignalCategory,
): number {
  const ageMs = Math.max(0, nowMs - ingestedAtMs);
  const halfLife = SIGNAL_DECAY_HALF_LIFE_MS[category];
  const factor = Math.pow(0.5, ageMs / halfLife);
  return Math.max(0, Math.min(1, baseStrength * factor));
}

export function computeSignalVelocity(
  signals: readonly { ingestedAtMs: number }[],
  nowMs: number,
  windowMs = 60_000,
): number {
  const cutoff = nowMs - windowMs;
  const count = signals.filter((row) => row.ingestedAtMs >= cutoff).length;
  return Math.round((count / (windowMs / 60_000)) * 100) / 100;
}
