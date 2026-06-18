import type { RecallTriggerMatch } from "@/lib/recall/recall-trigger-matchers";
import type { RecallEventSnapshot } from "@/lib/recall/recall-event-snapshot";

/** Composite 0–100 confidence from trigger weights + past signal. */
export function scoreRecallConfidence(
  matches: readonly RecallTriggerMatch[],
  past: RecallEventSnapshot,
  now = new Date(),
): number {
  if (matches.length === 0) {
    return 0;
  }

  let score = matches.reduce((sum, row) => sum + row.weight, 0);

  if (matches.length >= 2) {
    score += 12;
  }
  if (matches.length >= 3) {
    score += 8;
  }

  if (past.captureCount > 0) {
    score += Math.min(15, past.captureCount * 3);
  }

  if (past.lifecycle === "completed") {
    score += 8;
  }

  if (past.atIso) {
    const ms = Date.parse(past.atIso);
    if (!Number.isNaN(ms)) {
      const yearsAgo = (now.getTime() - ms) / (365.25 * 86_400_000);
      if (yearsAgo >= 0.25 && yearsAgo <= 5) {
        score += 10;
      }
    }
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}
