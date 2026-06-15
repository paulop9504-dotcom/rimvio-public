import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import {
  formatExperienceLensChip,
  formatExperienceTypeChip,
} from "@/lib/experience-graph/format-experience-lens";
import type { FeedSlotWindowLabels } from "@/lib/feed/group-feed-slots-by-window";
import { resolveFeedSlotWindowId } from "@/lib/feed/group-feed-slots-by-window";
import {
  deriveCalendarSlotHeadline,
} from "@/lib/feed/build-feed-today-slots";
import {
  deriveFeedSlotHeadline,
} from "@/lib/feed/derive-feed-slot-display";
import { resolveExperienceVolumeForSlot } from "@/lib/feed/project-experience-feed-labels";
import { resolvePlanContextForCalendarRow } from "@/lib/plan-context/project-plan-to-feed-slot";
import { surfaceTypeVisual } from "@/lib/feed/surface-type-visual";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { SurfaceType } from "@/lib/surface-engine/surface-contract";

export type FeedSlotTaxonomy = {
  slotId: string;
  /** 대분류 — 여행 · 식사 · 일정 … */
  l1Id: string;
  l1Label: string;
  /** 중분류 — 오늘 · 지금·출발 · 이후 … */
  l2Id: string;
  l2Label: string;
  /** 소분류 — 장소 · 세부 맥락 */
  l3Id: string;
  l3Label: string;
  searchText: string;
};

export type FeedSlotTaxonomyOption = {
  id: string;
  label: string;
  count: number;
};

export type FeedSlotTaxonomyFilters = {
  query: string;
  l1Id: string | null;
  l2Id: string | null;
  l3Id: string | null;
};

function slotSurfaceType(slot: FeedTodaySlot): SurfaceType {
  return slot.kind === "surface" ? slot.surface.type : slot.slotType;
}

function slotHeadline(
  slot: FeedTodaySlot,
  eventsById?: ReadonlyMap<string, EventCandidate>,
): string {
  if (slot.kind === "surface") {
    return deriveFeedSlotHeadline(slot.surface);
  }
  const plan =
    eventsById
      ? resolvePlanContextForCalendarRow(slot.row, eventsById)
      : null;
  return deriveCalendarSlotHeadline(slot.row);
}

function windowLabelForSlot(
  slot: FeedTodaySlot,
  labels: FeedSlotWindowLabels,
  now: Date,
): string {
  const id = resolveFeedSlotWindowId(slot, now);
  const map = {
    today: labels.today,
    tomorrow: labels.tomorrow,
    later: labels.later,
    unset: labels.unset,
  } as const;
  return map[id];
}

/** Per-slot 3-level taxonomy + search haystack. */
export function buildFeedSlotTaxonomy(input: {
  slot: FeedTodaySlot;
  eventsById?: ReadonlyMap<string, EventCandidate>;
  volumesByEventId?: ReadonlyMap<string, ExperienceVolume>;
  windowLabels: FeedSlotWindowLabels;
  now?: Date;
}): FeedSlotTaxonomy {
  const now = input.now ?? new Date();
  const { slot } = input;
  const volume = resolveExperienceVolumeForSlot(
    slot,
    input.volumesByEventId,
    input.eventsById,
  );
  const surfaceType = slotSurfaceType(slot);
  const surfaceVisual = surfaceTypeVisual(surfaceType);

  const l1 = volume
    ? formatExperienceTypeChip(volume.eventType)
    : { label: surfaceVisual.chipLabel, emoji: surfaceVisual.emoji };
  const l1Id = volume?.eventType ?? surfaceType;
  const l1Label = l1.label;

  const l2 = volume
    ? formatExperienceLensChip({
        eventType: volume.eventType,
        lens: volume.activeLens,
      })
    : null;
  const l2Id = volume ? `lens:${volume.activeLens}` : `window:${resolveFeedSlotWindowId(slot, now)}`;
  const l2Label = l2?.label ?? windowLabelForSlot(slot, input.windowLabels, now);

  const plan =
    slot.kind === "calendar" && input.eventsById
      ? resolvePlanContextForCalendarRow(slot.row, input.eventsById)
      : null;
  const place =
    volume?.space.label?.trim() ||
    plan?.place?.trim() ||
    slotHeadline(slot, input.eventsById).trim();
  const l3Id = place.toLowerCase().replace(/\s+/g, "-").slice(0, 48) || "detail";
  const l3Label = place.length > 28 ? `${place.slice(0, 26)}…` : place;

  const headline = slotHeadline(slot, input.eventsById);
  const searchParts = [
    l1Label,
    l2Label,
    l3Label,
    headline,
    plan?.place,
    slot.kind === "calendar" ? slot.row.event.title : null,
    slot.kind === "surface" ? slot.surface.title : null,
    volume?.space.label,
  ].filter((part): part is string => Boolean(part?.trim()));

  return {
    slotId: slot.id,
    l1Id,
    l1Label,
    l2Id,
    l2Label,
    l3Id,
    l3Label,
    searchText: searchParts.join(" ").toLowerCase(),
  };
}

export function buildFeedSlotTaxonomyMap(input: {
  slots: readonly FeedTodaySlot[];
  eventsById?: ReadonlyMap<string, EventCandidate>;
  volumesByEventId?: ReadonlyMap<string, ExperienceVolume>;
  windowLabels: FeedSlotWindowLabels;
  now?: Date;
}): Map<string, FeedSlotTaxonomy> {
  const map = new Map<string, FeedSlotTaxonomy>();
  for (const slot of input.slots) {
    map.set(
      slot.id,
      buildFeedSlotTaxonomy({
        slot,
        eventsById: input.eventsById,
        volumesByEventId: input.volumesByEventId,
        windowLabels: input.windowLabels,
        now: input.now,
      }),
    );
  }
  return map;
}

function normalizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function matchesQuery(taxonomy: FeedSlotTaxonomy, tokens: string[]): boolean {
  if (tokens.length === 0) {
    return true;
  }
  return tokens.every((token) => taxonomy.searchText.includes(token));
}

export function filterFeedSlotsByTaxonomy(input: {
  slots: readonly FeedTodaySlot[];
  taxonomies: Map<string, FeedSlotTaxonomy>;
  filters: FeedSlotTaxonomyFilters;
}): FeedTodaySlot[] {
  const tokens = normalizeQuery(input.filters.query);

  return input.slots.filter((slot) => {
    const taxonomy = input.taxonomies.get(slot.id);
    if (!taxonomy) {
      return false;
    }
    if (!matchesQuery(taxonomy, tokens)) {
      return false;
    }
    if (input.filters.l1Id && taxonomy.l1Id !== input.filters.l1Id) {
      return false;
    }
    if (input.filters.l2Id && taxonomy.l2Id !== input.filters.l2Id) {
      return false;
    }
    if (input.filters.l3Id && taxonomy.l3Id !== input.filters.l3Id) {
      return false;
    }
    return true;
  });
}

function countOptions(
  slots: readonly FeedTodaySlot[],
  taxonomies: Map<string, FeedSlotTaxonomy>,
  pick: (taxonomy: FeedSlotTaxonomy) => { id: string; label: string },
): FeedSlotTaxonomyOption[] {
  const counts = new Map<string, FeedSlotTaxonomyOption>();
  for (const slot of slots) {
    const taxonomy = taxonomies.get(slot.id);
    if (!taxonomy) {
      continue;
    }
    const { id, label } = pick(taxonomy);
    const existing = counts.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(id, { id, label, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
}

/** Cascading filter chips — L2/L3 scoped by parent selection. */
export function collectFeedSlotTaxonomyOptions(input: {
  slots: readonly FeedTodaySlot[];
  taxonomies: Map<string, FeedSlotTaxonomy>;
  filters: FeedSlotTaxonomyFilters;
}): {
  l1: FeedSlotTaxonomyOption[];
  l2: FeedSlotTaxonomyOption[];
  l3: FeedSlotTaxonomyOption[];
} {
  const tokens = normalizeQuery(input.filters.query);
  const base = input.slots.filter((slot) => {
    const taxonomy = input.taxonomies.get(slot.id);
    return taxonomy ? matchesQuery(taxonomy, tokens) : false;
  });

  const l1Pool = base;
  const l1 = countOptions(l1Pool, input.taxonomies, (row) => ({
    id: row.l1Id,
    label: row.l1Label,
  }));

  const l2Pool = input.filters.l1Id
    ? l1Pool.filter((slot) => input.taxonomies.get(slot.id)?.l1Id === input.filters.l1Id)
    : l1Pool;
  const l2 = countOptions(l2Pool, input.taxonomies, (row) => ({
    id: row.l2Id,
    label: row.l2Label,
  }));

  const l3Pool = input.filters.l2Id
    ? l2Pool.filter((slot) => input.taxonomies.get(slot.id)?.l2Id === input.filters.l2Id)
    : l2Pool;
  const l3 = countOptions(l3Pool, input.taxonomies, (row) => ({
    id: row.l3Id,
    label: row.l3Label,
  }));

  return { l1, l2, l3 };
}
