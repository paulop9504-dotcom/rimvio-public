import type {
  RelationshipFacts,
  RelationshipPatternMatch,
} from "@/lib/meaning/relationship-meaning-types";

/** Detect eligible narrative frames from peer facts. */
export function detectRelationshipPatterns(
  facts: RelationshipFacts,
): RelationshipPatternMatch[] {
  const matches: RelationshipPatternMatch[] = [];

  if (facts.contextCount >= 4 && facts.milestoneRatio < 0.4) {
    const score = Math.min(
      1,
      (facts.contextCount / 8) * (1 - facts.milestoneRatio) * 0.7 + 0.3,
    );
    matches.push({ frame: "repetition", score });
  }

  if (
    facts.spanDays >= 300 &&
    facts.frequencyTrend === "rising" &&
    facts.contextCount >= 3
  ) {
    const spanBoost = Math.min(1, facts.spanDays / 730);
    const score = Math.min(1, spanBoost * 0.55 + (facts.contextCount / 12) * 0.45);
    matches.push({ frame: "emergence", score });
  }

  if (facts.daysSinceLast >= 120 && facts.contextCount >= 3) {
    const dormancyBoost = Math.min(1, facts.daysSinceLast / 365);
    const score = Math.min(
      1,
      dormancyBoost * 0.5 + Math.min(1, facts.contextCount / 8) * 0.5,
    );
    matches.push({ frame: "dormancy", score });
  }

  if (facts.distinctPlaces >= 4 && facts.contextCount >= 3) {
    const score = Math.min(
      1,
      (facts.distinctPlaces / 8) * 0.6 + (facts.contextCount / 10) * 0.4,
    );
    matches.push({ frame: "spread", score });
  }

  return matches.sort((a, b) => b.score - a.score);
}
