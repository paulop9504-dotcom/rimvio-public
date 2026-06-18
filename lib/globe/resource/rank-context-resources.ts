import type { EventCandidate } from "@/lib/events/event-candidate";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import { readContextGardenArchivedResourceIds } from "@/lib/globe/context-gardener/read-context-garden";
import { isResourceExpiredForGarden } from "@/lib/globe/context-gardener/sanitize-context-resources";
import { listLodgingResourcesForEvent } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { scoreHubServiceRowBase } from "@/lib/globe/context-hub/score-hub-service-row";
import {
  mapHubServiceRowToResource,
  type RankedContextResource,
} from "@/lib/globe/resource/map-hub-service-to-resource";
import { rankLodgingResources } from "@/lib/globe/resource/rank-lodging-resources";
import type { ContextResource } from "@/lib/globe/resource/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scoreResourceJit(input: {
  event: EventCandidate;
  resource: ContextResource;
  hubRow: ContextHubServiceRow;
  nowIso: string;
  lat: number | null;
  lng: number | null;
}): number {
  let score = scoreHubServiceRowBase(input.hubRow);

  const plan = readPlanContextFromEvent(input.event);
  const meta = input.event.metadata ?? {};
  const eventLat = input.resource.spacetime.lat ?? readFiniteCoord(meta.globePlaceLat);
  const eventLng = input.resource.spacetime.lng ?? readFiniteCoord(meta.globePlaceLng);

  const fit = scoreSpacetimeFit({
    capturedAtIso: input.nowIso,
    lat: input.lat,
    lng: input.lng,
    eventStartIso:
      input.resource.spacetime.validFromIso ??
      input.event.datetime ??
      input.nowIso,
    eventEndIso: input.resource.spacetime.validUntilIso ?? plan?.windowEndIso ?? null,
    eventPlace: input.resource.spacetime.placeLabel,
    eventLat,
    eventLng,
    capturedPlaceLabel: null,
  });

  if (input.resource.kind === "ticket") {
    if (fit.fits && fit.placeOk) {
      score += 140;
    } else if (fit.timeOk && fit.placeOk) {
      score += 95;
    } else if (fit.timeOk) {
      score += 55;
    }
    if (input.resource.action?.kind === "show_qr") {
      score += 25;
    }
  }

  if (input.resource.kind === "flight") {
    if (fit.timeOk && !fit.placeOk) {
      score += 45;
    }
    if (fit.timeOk && fit.placeOk) {
      score += 20;
    }
  }

  if (input.resource.kind === "ai_handoff" && fit.timeOk) {
    score += 15;
  }

  if (!input.resource.action) {
    score -= 80;
  }

  return score;
}

/** JIT rank — GPS · Now · spacetime · artifact urgency. Hub does not call this. */
export function rankContextResources(input: {
  event: EventCandidate;
  services: readonly ContextHubServiceRow[];
  now?: Date;
  lat?: number | null;
  lng?: number | null;
}): RankedContextResource[] {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;

  const serviceRanked = input.services
    .filter((row) => row.offered && row.serviceId !== "lodging")
    .map((hubRow) => {
      const resource = mapHubServiceRowToResource(input.event, hubRow);
      return {
        resource,
        hubRow,
        rankScore: scoreResourceJit({
          event: input.event,
          resource,
          hubRow,
          nowIso,
          lat,
          lng,
        }),
      };
    });

  const lodgingResources = listLodgingResourcesForEvent(input.event);
  const lodgingRanked =
    lodgingResources.length > 0
      ? rankLodgingResources({
          event: input.event,
          resources: lodgingResources,
          lat,
          lng,
        })
      : [];

  const ranked = [...serviceRanked, ...lodgingRanked].sort((left, right) => {
    const delta = right.rankScore - left.rankScore;
    if (delta !== 0) {
      return delta;
    }
    return left.resource.label.localeCompare(right.resource.label, "ko");
  });

  const archivedIds = new Set(readContextGardenArchivedResourceIds(input.event));
  const nowMs = now.getTime();

  return ranked.filter((entry) => {
    if (archivedIds.has(entry.resource.resourceId)) {
      return false;
    }
    return !isResourceExpiredForGarden(entry.resource, nowMs);
  });
}

export function filterLodgingRankedResources(
  ranked: readonly RankedContextResource[],
): RankedContextResource[] {
  return ranked.filter((entry) => entry.resource.kind === "lodging_voucher");
}
