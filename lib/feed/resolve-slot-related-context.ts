import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import { resolveFeedSlotPeerContexts } from "@/lib/feed/resolve-feed-slot-peer-context";
import type { FeedSlotPeerLookup } from "@/lib/feed/feed-slot-peer-context-types";
import { resolvePlanContextForCalendarRow } from "@/lib/plan-context/project-plan-to-feed-slot";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";
import { buildSearchableExperienceIndex } from "@/lib/search/build-searchable-experience-index";
import {
  rankRelatedContext,
  type RelatedContextHit,
} from "@/lib/search/search-related-context";
import type { SurfaceType } from "@/lib/surface-engine/surface-contract";

export type RelatedContextAxis = {
  kind: "people" | "experience";
  summaryLine: string;
  labels: readonly string[];
  related: readonly RelatedContextHit[];
};

export type SlotRelatedContextBundle = {
  /** @deprecated Use axes — kept for quick counts */
  summaryLine: string;
  labels: readonly string[];
  related: readonly RelatedContextHit[];
  people: RelatedContextAxis;
  experience: RelatedContextAxis;
};

const SLOT_TYPE_LABEL: Partial<Record<SurfaceType, string>> = {
  travel: "여행",
  food: "맛집",
  schedule: "일정",
  social: "만남",
};

function resolveSlotEventId(slot: FeedTodaySlot): string | null {
  if (slot.kind === "calendar") {
    return slot.row.event.eventId?.trim() ?? null;
  }
  return slot.surface.events[0]?.eventId?.trim() ?? null;
}

function resolveSlotType(slot: FeedTodaySlot): SurfaceType {
  return slot.kind === "surface" ? slot.surface.type : slot.slotType;
}

export function derivePeopleContextLabels(input: {
  plan: PlanContext | null;
  peers: readonly { displayName: string }[];
}): string[] {
  const labels: string[] = [];
  const primary = input.plan?.peerDisplayName?.trim();
  if (primary) {
    labels.push(primary);
  }
  for (const peer of input.peers) {
    const name = peer.displayName?.trim();
    if (name && !labels.includes(name)) {
      labels.push(name);
    }
  }
  return labels;
}

export function deriveExperienceContextLabels(input: {
  plan: PlanContext | null;
  place?: string | null;
  slotType: SurfaceType;
}): string[] {
  const labels: string[] = [];
  const place = input.plan?.place?.trim() ?? input.place?.trim();
  if (place) {
    labels.push(place.replace(/\s*여행$/u, "").trim() || place);
  }
  const typeLabel = SLOT_TYPE_LABEL[input.slotType];
  if (typeLabel && !labels.includes(typeLabel)) {
    labels.push(typeLabel);
  }
  const title = input.plan?.title?.trim();
  if (title) {
    const short = title.replace(/\s*여행$/u, "").trim();
    if (short && !labels.includes(short)) {
      labels.push(short);
    }
  }
  return labels;
}

/** Pure read — short labels for what this experience connects to. */
export function deriveRelatedContextLabels(input: {
  plan: PlanContext | null;
  peers: readonly { displayName: string }[];
  place?: string | null;
  slotType: SurfaceType;
}): string[] {
  return [
    ...derivePeopleContextLabels({ plan: input.plan, peers: input.peers }),
    ...deriveExperienceContextLabels({
      plan: input.plan,
      place: input.place,
      slotType: input.slotType,
    }),
  ];
}

function searchTermsFromLabels(labels: readonly string[]): string[] {
  return labels.flatMap((label) => label.split(/\s+/u).filter((part) => part.length >= 2));
}

/** Pure read — summary + ranked related experiences (excludes self). */
export function resolveSlotRelatedContextBundle(input: {
  slot: FeedTodaySlot;
  events: readonly EventCandidate[];
  eventsById: ReadonlyMap<string, EventCandidate>;
  peerLookup: FeedSlotPeerLookup;
  limit?: number;
}): SlotRelatedContextBundle | null {
  const eventId = resolveSlotEventId(input.slot);
  if (!eventId) {
    return null;
  }

  const event = input.eventsById.get(eventId);
  const plan =
    input.slot.kind === "calendar"
      ? resolvePlanContextForCalendarRow(input.slot.row, input.eventsById)
      : event
        ? readPlanContextFromEvent(event)
        : null;

  const peers = resolveFeedSlotPeerContexts(input.slot, input.peerLookup, plan);
  const slotType = resolveSlotType(input.slot);
  const place = plan?.place ?? event?.place ?? null;

  const peopleLabels = derivePeopleContextLabels({ plan, peers });
  const experienceLabels = deriveExperienceContextLabels({ plan, place, slotType });
  const labels = deriveRelatedContextLabels({ plan, peers, place, slotType });

  if (peopleLabels.length === 0 && experienceLabels.length === 0) {
    return null;
  }

  const index = buildSearchableExperienceIndex(input.events);
  const perAxisLimit = input.limit ?? 4;

  const peopleHits = rankRelatedContext(index, searchTermsFromLabels(peopleLabels), {
    excludeEventId: eventId,
    limit: perAxisLimit,
  });
  const experienceHits = rankRelatedContext(index, searchTermsFromLabels(experienceLabels), {
    excludeEventId: eventId,
    limit: perAxisLimit,
  });

  const people: RelatedContextAxis = {
    kind: "people",
    summaryLine: peopleLabels.join(" · "),
    labels: peopleLabels,
    related: peopleHits,
  };
  const experience: RelatedContextAxis = {
    kind: "experience",
    summaryLine: experienceLabels.join(" · "),
    labels: experienceLabels,
    related: experienceHits,
  };

  const related = mergeRelatedHits(peopleHits, experienceHits, perAxisLimit * 2);

  return {
    summaryLine: labels.join(" · "),
    labels,
    related,
    people,
    experience,
  };
}

function mergeRelatedHits(
  people: readonly RelatedContextHit[],
  experience: readonly RelatedContextHit[],
  limit: number,
): RelatedContextHit[] {
  const seen = new Set<string>();
  const merged: RelatedContextHit[] = [];
  const maxLen = Math.max(people.length, experience.length);
  for (let i = 0; i < maxLen; i += 1) {
    for (const row of [people[i], experience[i]]) {
      if (!row || seen.has(row.eventId)) {
        continue;
      }
      seen.add(row.eventId);
      merged.push(row);
      if (merged.length >= limit) {
        return merged;
      }
    }
  }
  return merged;
}
