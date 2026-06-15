import { constraintsAreActive } from "@/lib/event-os/contextual-recommendation/build-recommendation-constraints";
import type {
  RecommendationInput,
  RecommendationResult,
} from "@/lib/event-os/contextual-recommendation/recommendation-types";

const LAST_MEAL_MENTION =
  /(?:어제|방금|점심에|아침에|저녁에).*(?:먹|먹었)|(?:먹었는데|먹었어)/u;

export function validateRecommendationResult(
  input: RecommendationInput,
  result: RecommendationResult
): string[] {
  const failures: string[] = [];

  if (result.intent === "UNKNOWN") {
    failures.push("intent_unknown");
  }

  if (!constraintsAreActive(result.constraints)) {
    failures.push("constraint_missing");
  }

  const messageMentionsLastMeal = LAST_MEAL_MENTION.test(input.message);
  const historyMentionsMeal = Boolean(input.eventHistory?.length);
  if (
    (messageMentionsLastMeal || historyMentionsMeal) &&
    !result.context.lastMeal
  ) {
    failures.push("last_meal_ignored");
  }

  if (result.rankedCandidates.length === 0) {
    failures.push("ranking_empty");
  }

  for (const row of result.rankedCandidates) {
    if (!Number.isFinite(row.score) || row.score <= 0) {
      failures.push(`score_missing:${row.item}`);
    }
    const breakdownSum =
      row.breakdown.diversity +
      row.breakdown.healthBalance +
      row.breakdown.satisfaction +
      row.breakdown.contextMatch;
    if (row.breakdown.total !== breakdownSum) {
      failures.push(`score_breakdown_invalid:${row.item}`);
    }
  }

  if (result.explanationTrace.length !== result.rankedCandidates.length) {
    failures.push("explanation_count_mismatch");
  }

  for (const trace of result.explanationTrace) {
    if (trace.lines.length === 0) {
      failures.push(`explanation_missing:${trace.item}`);
    }
  }

  if (!result.decisionRationale.trim()) {
    failures.push("decision_rationale_missing");
  }

  return failures;
}
