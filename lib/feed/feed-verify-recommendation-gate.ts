import type { EventCandidate } from "@/lib/events/event-candidate";
import { hasPendingFeedCaptureVerify } from "@/lib/feed/feed-capture-metadata";
import type { FeedSlotPill } from "@/lib/feed/feed-slot-pill-types";
import type { PlanStackLeg, PlanStackProjection } from "@/lib/plan-context/plan-stack-types";

/** L2.5 — auto-attached experience ≠ auto recommendation / execution. */
export function shouldDeferFeedRecommendations(
  event: EventCandidate | null | undefined,
): boolean {
  return hasPendingFeedCaptureVerify(event);
}

const DEFERRED_LEG_LABEL =
  /(?:길찾기|맛집|식당|카페|이동|출발|네비|내비|추천|주변|근처)/iu;

const DEFERRED_SPAWN_URI =
  /(?:맛집|길찾기|navigate|kakao|map|place-search|food|restaurant|cafe)/iu;

function isNavigatePill(pill: FeedSlotPill): boolean {
  return pill.label.trim() === "길찾기" || pill.id.endsWith(":navigate");
}

function isDeferredPlanLeg(leg: PlanStackLeg): boolean {
  if (DEFERRED_LEG_LABEL.test(leg.label)) {
    return true;
  }
  if (leg.deeplink && DEFERRED_SPAWN_URI.test(leg.deeplink)) {
    return true;
  }
  return leg.spawnPhase === "travel";
}

/** Before 맞아요 — drop navigate; keep 나중에 (weak deferral). */
export function gateFeedSlotPills(
  pills: readonly FeedSlotPill[],
  event: EventCandidate | null | undefined,
): FeedSlotPill[] {
  if (!shouldDeferFeedRecommendations(event)) {
    return [...pills];
  }
  return pills.filter((pill) => !isNavigatePill(pill));
}

export function gatePlanStackProjection(
  stack: PlanStackProjection | null,
  event: EventCandidate | null | undefined,
): PlanStackProjection | null {
  if (!stack || !shouldDeferFeedRecommendations(event)) {
    return stack;
  }

  const filterLegs = (legs: readonly PlanStackLeg[]) =>
    legs.filter((leg) => !isDeferredPlanLeg(leg));

  const before = filterLegs(stack.before);
  const after = filterLegs(stack.after);
  if (before.length === 0 && after.length === 0) {
    return null;
  }
  return { before, after };
}

/** Block @ spawn URIs for food / navigate until verify. */
export function shouldDeferFeedSpawnUri(
  uri: string,
  event: EventCandidate | null | undefined,
): boolean {
  if (!shouldDeferFeedRecommendations(event)) {
    return false;
  }
  return DEFERRED_SPAWN_URI.test(uri);
}
