import { pickRelationshipMeaningLine } from "@/lib/copy/relationship-meaning-lines";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { collectRelationshipFacts } from "@/lib/meaning/collect-relationship-facts";
import { detectRelationshipPatterns } from "@/lib/meaning/detect-relationship-patterns";
import { rankRelationshipFrame } from "@/lib/meaning/rank-relationship-frame";
import {
  RELATIONSHIP_MEANING_MIN_CONFIDENCE,
  type RelationshipMeaningProjection,
} from "@/lib/meaning/relationship-meaning-types";

function formatFactAnchor(input: {
  peerDisplayName: string;
  contextCount: number;
  distinctPlaces: number;
  topPlace: string | null;
}): string {
  const parts = [
    input.peerDisplayName,
    `맥락 ${input.contextCount}`,
    input.distinctPlaces > 0 ? `장소 ${input.distinctPlaces}` : null,
    input.topPlace ? input.topPlace : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Pure read — peer-scoped MEANING line with confidence gate. */
export function projectRelationshipMeaningLine(input: {
  displayName: string;
  events: readonly EventCandidate[];
  now?: Date;
}): RelationshipMeaningProjection | null {
  const facts = collectRelationshipFacts(input);
  if (!facts) {
    return null;
  }

  const patterns = detectRelationshipPatterns(facts);
  const ranked = rankRelationshipFrame(patterns);
  if (!ranked || ranked.confidence < RELATIONSHIP_MEANING_MIN_CONFIDENCE) {
    return null;
  }

  return {
    frame: ranked.frame,
    line: pickRelationshipMeaningLine({
      frame: ranked.frame,
      peerDisplayName: facts.peerDisplayName,
    }),
    factAnchor: formatFactAnchor(facts),
    confidence: ranked.confidence,
    peerDisplayName: facts.peerDisplayName,
  };
}
