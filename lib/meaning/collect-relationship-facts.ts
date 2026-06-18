import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveExperienceIntent } from "@/lib/experience-intent/resolve-experience-intent";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { normalizeMeaningPlace } from "@/lib/meaning/meaning-node-id";
import type { RelationshipFacts, RelationshipFrequencyTrend } from "@/lib/meaning/relationship-meaning-types";
import { personLabelsMatch } from "@/lib/people-graph/match-person-label";
import { collectEventPeople } from "@/lib/people-graph/collect-event-people";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const MILESTONE_INTENTS = new Set([
  "wedding",
  "birthday",
  "travel",
  "funeral",
  "concert",
]);

function eventAtMs(event: EventCandidate): number {
  const raw = event.datetime ?? event.updatedAt ?? event.createdAt;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

function isMilestoneEvent(event: EventCandidate): boolean {
  const intent = resolveExperienceIntent(event).intent;
  if (MILESTONE_INTENTS.has(intent)) {
    return true;
  }
  const { photoCount } = countEventMedia(event);
  if (photoCount >= 6) {
    return true;
  }
  const title = event.title.trim();
  return /결혼|웨딩|생일|여행|졸업|입학/u.test(title);
}

function resolveFrequencyTrend(atMsList: number[]): RelationshipFrequencyTrend {
  if (atMsList.length < 4) {
    return "steady";
  }
  const sorted = [...atMsList].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const firstRate = firstHalf.length / Math.max(1, (firstHalf.at(-1)! - firstHalf[0]!) / (1000 * 60 * 60 * 24));
  const secondRate = secondHalf.length / Math.max(1, (secondHalf.at(-1)! - secondHalf[0]!) / (1000 * 60 * 60 * 24));

  if (secondRate > firstRate * 1.25) {
    return "rising";
  }
  if (secondRate < firstRate * 0.75) {
    return "falling";
  }
  return "steady";
}

function collectDistinctPlaces(events: readonly EventCandidate[]): Map<string, number> {
  const buckets = new Map<string, number>();
  for (const event of events) {
    const labels = new Set<string>();
    const plan = readPlanContextFromEvent(event);
    for (const value of [plan?.place, event.place]) {
      const place = typeof value === "string" ? normalizeMeaningPlace(value) : "";
      if (place) {
        labels.add(place);
      }
    }
    for (const capture of readFeedCaptureFragments(event)) {
      const place = capture.placeLabel ? normalizeMeaningPlace(capture.placeLabel) : "";
      if (place) {
        labels.add(place);
      }
    }
    for (const label of labels) {
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    }
  }
  return buckets;
}

/** Aggregate peer-scoped facts for MEANING projection. */
export function collectRelationshipFacts(input: {
  displayName: string;
  events: readonly EventCandidate[];
  now?: Date;
}): RelationshipFacts | null {
  const peerDisplayName = input.displayName.trim();
  if (!peerDisplayName || peerDisplayName === "나") {
    return null;
  }

  const nowMs = (input.now ?? new Date()).getTime();
  const related = input.events.filter(
    (event) =>
      event.lifecycle !== "archived" &&
      collectEventPeople(event).some((name) => personLabelsMatch(name, peerDisplayName)),
  );

  if (related.length === 0) {
    return null;
  }

  const atMsList = related.map(eventAtMs).filter((ms) => ms > 0);
  const lastAtMs = atMsList.length > 0 ? Math.max(...atMsList) : 0;
  const firstAtMs = atMsList.length > 0 ? Math.min(...atMsList) : 0;
  const daysSinceLast =
    lastAtMs > 0 ? Math.max(0, Math.round((nowMs - lastAtMs) / (1000 * 60 * 60 * 24))) : 0;
  const spanDays =
    firstAtMs > 0 && lastAtMs > firstAtMs
      ? Math.max(0, Math.round((lastAtMs - firstAtMs) / (1000 * 60 * 60 * 24)))
      : 0;

  const placeBuckets = collectDistinctPlaces(related);
  const topPlace =
    [...placeBuckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const milestoneCount = related.filter(isMilestoneEvent).length;
  const milestoneRatio = milestoneCount / related.length;

  let verifiedCaptureCount = 0;
  for (const event of related) {
    verifiedCaptureCount += readFeedCaptureFragments(event).filter((row) => row.verified).length;
  }

  return {
    peerDisplayName,
    contextCount: related.length,
    distinctPlaces: placeBuckets.size,
    daysSinceLast,
    spanDays,
    topPlace,
    milestoneRatio,
    frequencyTrend: resolveFrequencyTrend(atMsList),
    verifiedCaptureCount,
  };
}
