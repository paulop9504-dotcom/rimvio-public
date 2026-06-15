import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildRecallCandidate } from "@/lib/recall/build-recall-candidate";
import {
  buildRecallAnchorSnapshot,
  buildRecallEventSnapshot,
} from "@/lib/recall/recall-event-snapshot";
import { canSurfaceRecallCandidate } from "@/lib/recall/recall-spam-gate";
import { matchRecallTriggers } from "@/lib/recall/recall-trigger-matchers";
import {
  RECALL_MIN_CONFIDENCE,
  type RecallAnchor,
  type RecallCandidate,
} from "@/lib/recall/recall-types";

function isRecallablePastEvent(event: EventCandidate, now: Date): boolean {
  if (event.lifecycle === "archived") {
    return false;
  }
  const atIso = event.datetime ?? event.createdAt;
  const ms = atIso ? Date.parse(atIso) : NaN;
  if (!Number.isNaN(ms) && ms > now.getTime() + 86_400_000) {
    return false;
  }
  return true;
}

/** Pure read — rank recall candidates for an anchor context. */
export function resolveRecallCandidates(input: {
  anchor: RecallAnchor;
  events: readonly EventCandidate[];
  now?: Date;
  limit?: number;
}): RecallCandidate[] {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 5;
  const anchorSnapshot = buildRecallAnchorSnapshot(input.anchor);
  const excludeId = anchorSnapshot.eventId;

  const candidates: RecallCandidate[] = [];

  for (const event of input.events) {
    if (excludeId && event.id === excludeId) {
      continue;
    }
    if (!isRecallablePastEvent(event, now)) {
      continue;
    }

    const pastSnapshot = buildRecallEventSnapshot(event, now);
    const matches = matchRecallTriggers(anchorSnapshot, pastSnapshot);
    if (matches.length === 0) {
      continue;
    }

    const candidate = buildRecallCandidate({
      pastEvent: event,
      pastSnapshot,
      matches,
      now,
    });

    if (candidate.confidence < RECALL_MIN_CONFIDENCE) {
      continue;
    }

    candidates.push(candidate);
  }

  return candidates
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.triggers.length - left.triggers.length,
    )
    .slice(0, limit);
}

/** Apply daily spam gate — returns at most one recall ready to surface. */
export function pickSurfacedRecallCandidate(
  candidates: readonly RecallCandidate[],
  now = new Date(),
): RecallCandidate | null {
  for (const candidate of candidates) {
    if (
      canSurfaceRecallCandidate(candidate.id, candidate.eventId, now)
    ) {
      return candidate;
    }
  }
  return null;
}

/** Main entry — resolve + spam gate in one call. */
export function resolveSurfacedRecall(input: {
  anchor: RecallAnchor;
  events: readonly EventCandidate[];
  now?: Date;
}): RecallCandidate | null {
  const candidates = resolveRecallCandidates(input);
  return pickSurfacedRecallCandidate(candidates, input.now);
}
