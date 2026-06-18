import type { EventCandidate } from "@/lib/events/event-candidate";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import type { ContextGardenSubGroup } from "@/lib/globe/context-gardener/types";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import type { ContextResourceKind } from "@/lib/globe/resource/types";

const HUB_LABEL_KO: Record<string, string> = {
  ticket: "티켓",
  flight: "항공",
  lodging: "숙소",
  rental_car: "렌트카",
  ai_search: "탐색",
};

const KIND_LABEL_KO: Record<ContextResourceKind, string> = {
  ticket: "티켓",
  flight: "항공",
  lodging_voucher: "숙소",
  rental_car: "렌트카",
  media_album: "앨범",
  schedule: "일정",
  ai_handoff: "탐색",
};

function dayOffsetLabel(
  eventStartIso: string | null | undefined,
  resourceStartIso: string | null | undefined,
): string {
  const eventMs = parseIsoMs(eventStartIso ?? null);
  const resourceMs = parseIsoMs(resourceStartIso ?? eventStartIso ?? null);
  if (eventMs === null || resourceMs === null) {
    return "일정";
  }
  const dayDiff = Math.floor((resourceMs - eventMs) / (24 * 60 * 60 * 1000));
  if (dayDiff <= 0) {
    return "당일";
  }
  return `${dayDiff}일차`;
}

function resolveHubLabel(entry: RankedContextResource): string {
  return (
    HUB_LABEL_KO[entry.resource.sourceHubId] ??
    KIND_LABEL_KO[entry.resource.kind] ??
    "실행"
  );
}

function buildGroupKey(input: {
  event: EventCandidate;
  entry: RankedContextResource;
}): string {
  const startIso =
    input.entry.resource.spacetime.validFromIso ?? input.event.datetime ?? null;
  const day = dayOffsetLabel(input.event.datetime, startIso);
  const hub = resolveHubLabel(input.entry);
  const place = input.entry.resource.spacetime.placeLabel?.trim().slice(0, 24) ?? "";
  const lat = input.entry.resource.spacetime.lat;
  const lng = input.entry.resource.spacetime.lng;
  const geo =
    lat != null && lng != null
      ? `${lat.toFixed(2)},${lng.toFixed(2)}`
      : "no-geo";
  return `${day}|${hub}|${place}|${geo}`;
}

/** Auto-group executions inside one Creation Context — spacetime + hub similarity. */
export function groupContextResources(input: {
  event: EventCandidate;
  activeRanked: readonly RankedContextResource[];
}): ContextGardenSubGroup[] {
  const buckets = new Map<
    string,
    {
      labelKo: string;
      resourceIds: string[];
      windowStartIso: string | null;
      windowEndIso: string | null;
    }
  >();

  for (const entry of input.activeRanked) {
    const key = buildGroupKey({ event: input.event, entry });
    const day = dayOffsetLabel(
      input.event.datetime,
      entry.resource.spacetime.validFromIso ?? input.event.datetime,
    );
    const labelKo = `${day} · ${resolveHubLabel(entry)}`;
    const existing = buckets.get(key);
    const startIso = entry.resource.spacetime.validFromIso ?? null;
    const endIso = entry.resource.spacetime.validUntilIso ?? null;

    if (!existing) {
      buckets.set(key, {
        labelKo,
        resourceIds: [entry.resource.resourceId],
        windowStartIso: startIso,
        windowEndIso: endIso,
      });
      continue;
    }

    existing.resourceIds.push(entry.resource.resourceId);
    if (
      startIso &&
      (!existing.windowStartIso || startIso < existing.windowStartIso)
    ) {
      existing.windowStartIso = startIso;
    }
    if (
      endIso &&
      (!existing.windowEndIso || endIso > existing.windowEndIso)
    ) {
      existing.windowEndIso = endIso;
    }
  }

  return [...buckets.entries()].map(([groupId, group]) => ({
    groupId,
    labelKo: group.labelKo,
    resourceIds: group.resourceIds,
    windowStartIso: group.windowStartIso,
    windowEndIso: group.windowEndIso,
  }));
}
