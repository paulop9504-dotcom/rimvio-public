import { listLearningRollup } from "@/lib/archive/learning-rollup-store";
import { buildPlaceScopedLearningContextKey } from "@/lib/globe/passive-context/build-place-scoped-learning-key";
import type {
  PlacePrefillHubId,
  PlacePrefillHubSuggestion,
} from "@/lib/globe/place-history/place-prefill-types";

const MIN_EXECUTED = 1;
const MIN_SCORE_DELTA = 0.15;

const HUB_LABEL_KO: Record<PlacePrefillHubId, string> = {
  lodging: "숙소",
  flight: "항공",
  ticket: "티켓",
};

function parseHubId(actionKey: string): PlacePrefillHubId | null {
  if (actionKey === "hub:lodging") {
    return "lodging";
  }
  if (actionKey === "hub:flight") {
    return "flight";
  }
  if (actionKey === "hub:ticket") {
    return "ticket";
  }
  return null;
}

/** Read place-scoped rollup — successful hub patterns from past trips. */
export function listPlaceSuccessPatterns(
  placeLabel: string,
): PlacePrefillHubSuggestion[] {
  const contextKey = buildPlaceScopedLearningContextKey(placeLabel);
  if (!contextKey) {
    return [];
  }

  const hubScores = new Map<PlacePrefillHubId, PlacePrefillHubSuggestion>();

  for (const entry of listLearningRollup()) {
    if (entry.contextKey !== contextKey) {
      continue;
    }

    const hubId = parseHubId(entry.actionKey);
    if (!hubId) {
      continue;
    }
    if (entry.executed < MIN_EXECUTED && entry.scoreDelta < MIN_SCORE_DELTA) {
      continue;
    }
    if (entry.rates.dismissRate > entry.rates.executeRate) {
      continue;
    }
    const score = entry.executed * 10 + entry.scoreDelta * 100;
    const prior = hubScores.get(hubId);
    if (!prior || score > prior.score) {
      hubScores.set(hubId, {
        hubId,
        labelKo: HUB_LABEL_KO[hubId],
        score,
        executedCount: entry.executed,
      });
    }
  }

  return [...hubScores.values()].sort((left, right) => right.score - left.score);
}
