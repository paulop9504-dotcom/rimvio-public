import {
  KERNEL_MICRO_INTENT_KEYS,
  type MicroIntentDistribution,
} from "@/lib/event-kernel/types";

const LOG2 = Math.log(2);

/** Shannon entropy normalized to [0, 1] over micro-intent distribution. */
export function computeMicroIntentEntropy(distribution: MicroIntentDistribution): number {
  let entropy = 0;
  for (const key of KERNEL_MICRO_INTENT_KEYS) {
    const p = distribution[key];
    if (p > 0) {
      entropy -= p * (Math.log(p) / LOG2);
    }
  }

  const maxEntropy = Math.log(KERNEL_MICRO_INTENT_KEYS.length) / LOG2;
  if (maxEntropy <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, entropy / maxEntropy));
}
