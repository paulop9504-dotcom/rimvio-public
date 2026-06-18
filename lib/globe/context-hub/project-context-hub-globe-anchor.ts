import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GlobeContextHubMapAnchor } from "@/lib/globe/context-hub/context-hub-globe-anchor-types";
import { hasActiveContextHub } from "@/lib/globe/context-hub/has-active-context-hub";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

const HUB_ANCHOR_ZOOM_LEVELS = new Set<GlobeDetailLevel>([
  "city",
  "neighborhood",
  "street",
  "pin",
]);

/** Offset anchor slightly from context pin so both remain tappable. */
const ANCHOR_LAT_OFFSET = 0.0018;
const ANCHOR_LNG_OFFSET = 0.0012;

export function shouldRenderContextHubGlobeAnchor(
  detailLevel: GlobeDetailLevel,
): boolean {
  return HUB_ANCHOR_ZOOM_LEVELS.has(detailLevel);
}

export function projectContextHubGlobeAnchor(input: {
  event: EventCandidate;
  lat: number;
  lng: number;
}): GlobeContextHubMapAnchor | null {
  if (!hasActiveContextHub(input.event)) {
    return null;
  }

  const panel = listContextHubServicesForEvent(input.event);
  if (!panel) {
    return null;
  }

  const connected = panel.services.filter((row) => row.connected);
  if (connected.length === 0) {
    return null;
  }

  if (
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng)
  ) {
    return null;
  }

  return {
    markerKind: "context_hub",
    id: `context-hub:${input.event.id}`,
    contextEventId: input.event.id,
    label: panel.contextPlace,
    shortLabel: connected[0]?.shortLabelKo ?? "허브",
    lat: input.lat + ANCHOR_LAT_OFFSET,
    lng: input.lng + ANCHOR_LNG_OFFSET,
    connectedCount: connected.length,
  };
}
