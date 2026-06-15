import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  EXPERIENCE_INTENT_META_KEYS,
  INTENT_CONFIDENCE_FULL_SCORE,
  INTENT_MIN_WIN_SCORE,
  type ExperienceIntent,
  type IntentResolution,
} from "@/lib/experience-intent/experience-intent-types";
import { buildIntentScorerInput } from "@/lib/experience-intent/intent-scorer-input";
import { intentSpecFor } from "@/lib/experience-intent/intent-signal-registry";
import { scoreIntentEvidence } from "@/lib/experience-intent/score-intent-evidence";

function confidenceFromScore(score: number, threshold: number): number {
  if (score <= 0) {
    return 0;
  }
  const normalized = Math.round(
    (score / INTENT_CONFIDENCE_FULL_SCORE) * 100,
  );
  const thresholdBoost =
    score >= threshold ? 0 : -Math.round(((threshold - score) / threshold) * 20);
  return Math.min(100, Math.max(0, normalized + thresholdBoost));
}

function pickWinner(
  board: ReturnType<typeof scoreIntentEvidence>,
): { intent: ExperienceIntent; score: number; confidence: number } {
  const top = board.winner;
  const spec = intentSpecFor(top.intent);
  const threshold = spec?.winThreshold ?? INTENT_MIN_WIN_SCORE;

  if (top.intent !== "other" && top.score >= threshold) {
    return {
      intent: top.intent,
      score: top.score,
      confidence: confidenceFromScore(top.score, threshold),
    };
  }

  const bestNonOther = board.entries.find(
    (entry) => entry.intent !== "other" && entry.score >= INTENT_MIN_WIN_SCORE,
  );
  if (bestNonOther) {
    const bestSpec = intentSpecFor(bestNonOther.intent);
    const bestThreshold = bestSpec?.winThreshold ?? INTENT_MIN_WIN_SCORE;
    if (bestNonOther.score >= bestThreshold) {
      return {
        intent: bestNonOther.intent,
        score: bestNonOther.score,
        confidence: confidenceFromScore(bestNonOther.score, bestThreshold),
      };
    }
  }

  const fallbackScore = top.intent === "other" ? top.score : Math.max(5, top.score);
  return {
    intent: "other",
    score: fallbackScore,
    confidence: confidenceFromScore(fallbackScore, 10),
  };
}

/** Pure read — rule-based intent from EventCandidate (+ metadata captures/plan/calendar). */
export function resolveExperienceIntent(event: EventCandidate): IntentResolution {
  const input = buildIntentScorerInput(event);
  const board = scoreIntentEvidence(input);
  const picked = pickWinner(board);

  const winnerEntry =
    board.entries.find((entry) => entry.intent === picked.intent) ?? board.winner;
  const runnerUpEntry = board.entries.find(
    (entry) => entry.intent !== picked.intent && entry.intent !== "other",
  );

  return {
    intent: picked.intent,
    confidence: picked.confidence,
    score: picked.score,
    runnerUp: runnerUpEntry
      ? { intent: runnerUpEntry.intent, score: runnerUpEntry.score }
      : null,
    evidence: winnerEntry.evidence,
    resolvedAt: new Date().toISOString(),
  };
}

/** Read stamped intent from event metadata (if present). */
export function readExperienceIntentFromEvent(
  event: EventCandidate | null | undefined,
): IntentResolution | null {
  const meta = event?.metadata;
  if (!meta) {
    return null;
  }
  const intent = meta[EXPERIENCE_INTENT_META_KEYS.intent];
  if (typeof intent !== "string") {
    return null;
  }

  const confidence =
    typeof meta[EXPERIENCE_INTENT_META_KEYS.confidence] === "number"
      ? meta[EXPERIENCE_INTENT_META_KEYS.confidence]
      : 0;
  const score =
    typeof meta[EXPERIENCE_INTENT_META_KEYS.score] === "number"
      ? meta[EXPERIENCE_INTENT_META_KEYS.score]
      : 0;
  const evidenceRaw = meta[EXPERIENCE_INTENT_META_KEYS.evidence];
  const evidence = Array.isArray(evidenceRaw) ? evidenceRaw : [];
  const runnerUpRaw = meta[EXPERIENCE_INTENT_META_KEYS.runnerUp];
  const runnerUp =
    runnerUpRaw &&
    typeof runnerUpRaw === "object" &&
    runnerUpRaw !== null &&
    typeof (runnerUpRaw as { intent?: unknown }).intent === "string" &&
    typeof (runnerUpRaw as { score?: unknown }).score === "number"
      ? {
          intent: (runnerUpRaw as { intent: ExperienceIntent }).intent,
          score: (runnerUpRaw as { score: number }).score,
        }
      : null;

  return {
    intent: intent as ExperienceIntent,
    confidence,
    score,
    runnerUp,
    evidence: evidence as IntentResolution["evidence"],
    resolvedAt:
      typeof meta[EXPERIENCE_INTENT_META_KEYS.resolvedAt] === "string"
        ? meta[EXPERIENCE_INTENT_META_KEYS.resolvedAt]
        : new Date().toISOString(),
  };
}
