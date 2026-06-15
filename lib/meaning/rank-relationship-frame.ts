import type {
  RelationshipMeaningFrame,
  RelationshipPatternMatch,
} from "@/lib/meaning/relationship-meaning-types";

export function rankRelationshipFrame(
  patterns: readonly RelationshipPatternMatch[],
): { frame: RelationshipMeaningFrame; confidence: number } | null {
  const winner = patterns[0];
  if (!winner || winner.score < 0.45) {
    return null;
  }
  return {
    frame: winner.frame,
    confidence: Math.min(1, winner.score),
  };
}
