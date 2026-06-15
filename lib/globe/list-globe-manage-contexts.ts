import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { isGlobeContextRemoved } from "@/lib/globe/delete-globe-context";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import {
  listGlobeProjectedContexts,
  type GlobeProjectedContextEntry,
} from "@/lib/globe/list-globe-projected-contexts";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type GlobeManageContextKind = "globe" | "schedule" | "archived";

export type GlobeManageContextEntry = GlobeProjectedContextEntry & {
  onGlobe: boolean;
  manageKind: GlobeManageContextKind;
  kindLabel: string;
};

function parseMs(iso: string | null | undefined): number {
  if (!iso?.trim()) {
    return 0;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function hasScheduleAnchor(event: EventCandidate): boolean {
  if (event.datetime?.trim()) {
    return true;
  }
  const plan = readPlanContextFromEvent(event);
  return Boolean(plan?.windowStartIso?.trim());
}

function isOffGlobeManageCandidate(event: EventCandidate): boolean {
  if (hasScheduleAnchor(event)) {
    return true;
  }

  const meta = event.metadata ?? {};
  if (meta.feedPlanEnabled === true || meta.globeManualContext === true) {
    return true;
  }

  if (
    event.lifecycle === "scheduled" ||
    event.lifecycle === "confirmed" ||
    event.lifecycle === "active"
  ) {
    return true;
  }

  const source = meta.targetingSource;
  if (typeof source === "string") {
    return /schedule|calendar|notification|plan|globe_manual/u.test(source);
  }

  return event.source === "notification" || event.source === "calendar";
}

function classifyManageKind(
  event: EventCandidate,
  onGlobe: boolean,
): GlobeManageContextKind {
  if (onGlobe) {
    return "globe";
  }
  if (event.lifecycle === "completed" || event.lifecycle === "archived") {
    return "archived";
  }
  return "schedule";
}

function kindLabelFor(kind: GlobeManageContextKind): string {
  if (kind === "globe") {
    return "지구본";
  }
  if (kind === "archived") {
    return "보관";
  }
  return "일정";
}

function eventToOffGlobeEntry(event: EventCandidate): GlobeManageContextEntry {
  const plan = readPlanContextFromEvent(event);
  const pin = findPersonalGlobePinByEventId(event.id);
  const coords = resolveEventGlobeCoords(event);
  const startIso =
    plan?.windowStartIso?.trim() ||
    event.datetime?.trim() ||
    pin?.createdAtIso ||
    null;
  const { photoCount, videoCount } = countEventMedia(event);
  const manageKind = classifyManageKind(event, false);

  return {
    eventId: event.id,
    pinId: pin?.pinId ?? `manage:${event.id}`,
    title:
      pin?.experienceTitle?.trim() ||
      plan?.title?.trim() ||
      event.title.trim() ||
      "맥락",
    place:
      pin?.placeLabel?.trim() ||
      plan?.place?.trim() ||
      event.place?.trim() ||
      coords.placeLabel,
    dateLabel: formatPinDateLabel(startIso),
    photoCount: Math.max(photoCount, pin?.photoCount ?? 0),
    videoCount: Math.max(videoCount, pin?.videoCount ?? 0),
    lat: pin?.lat ?? coords.lat,
    lng: pin?.lng ?? coords.lng,
    sortMs: parseMs(startIso),
    onGlobe: false,
    manageKind,
    kindLabel: kindLabelFor(manageKind),
  };
}

function projectedToManageEntry(
  entry: GlobeProjectedContextEntry,
  event: EventCandidate | null,
): GlobeManageContextEntry {
  const manageKind = classifyManageKind(event ?? ({} as EventCandidate), true);
  return {
    ...entry,
    onGlobe: true,
    manageKind,
    kindLabel: kindLabelFor(manageKind),
  };
}

/** Globe pins + off-globe schedules (datetime/plan anchors not projected on the globe). */
export function listGlobeManageContexts(input: {
  events: readonly EventCandidate[];
  volumes: readonly ExperienceVolume[];
  eventsById?: ReadonlyMap<string, EventCandidate>;
  now?: Date;
}): GlobeManageContextEntry[] {
  const eventsById =
    input.eventsById ??
    new Map(input.events.map((event) => [event.id, event] as const));

  const projected = listGlobeProjectedContexts({
    events: input.events,
    volumes: input.volumes,
    eventsById,
  });

  const projectedIds = new Set(projected.map((row) => row.eventId));
  const merged = new Map<string, GlobeManageContextEntry>();

  for (const entry of projected) {
    merged.set(
      entry.eventId,
      projectedToManageEntry(entry, eventsById.get(entry.eventId) ?? null),
    );
  }

  for (const event of input.events) {
    if (projectedIds.has(event.id) || isGlobeContextRemoved(event)) {
      continue;
    }
    if (!isOffGlobeManageCandidate(event)) {
      continue;
    }
    merged.set(event.id, eventToOffGlobeEntry(event));
  }

  return [...merged.values()].sort((left, right) => right.sortMs - left.sortMs);
}

export function summarizeGlobeManageContexts(
  entries: readonly GlobeManageContextEntry[],
): { total: number; onGlobe: number; offGlobe: number } {
  const onGlobe = entries.filter((row) => row.onGlobe).length;
  return {
    total: entries.length,
    onGlobe,
    offGlobe: entries.length - onGlobe,
  };
}
