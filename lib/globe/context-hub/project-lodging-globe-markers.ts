import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import { readLodgingPayloadFromResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { filterLodgingRankedResources } from "@/lib/globe/resource/rank-context-resources";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

const LODGING_MARKER_ZOOM_LEVELS = new Set<GlobeDetailLevel>([
  "city",
  "neighborhood",
  "street",
  "pin",
]);

export function shouldRenderLodgingGlobeMarkers(
  detailLevel: GlobeDetailLevel,
): boolean {
  return LODGING_MARKER_ZOOM_LEVELS.has(detailLevel);
}

/** Ranked lodging inventory → globe View markers (no fetch). */
export function projectLodgingGlobeMarkers(input: {
  ranked: readonly RankedContextResource[];
  activeResourceId?: string | null;
}): GlobeLodgingMapMarker[] {
  const lodging = filterLodgingRankedResources(input.ranked);
  if (lodging.length === 0) {
    return [];
  }

  const activeId = input.activeResourceId?.trim() || lodging[0]?.resource.resourceId;

  return lodging
    .map((entry) => {
      const carouselIndex = input.ranked.findIndex(
        (row) => row.resource.resourceId === entry.resource.resourceId,
      );
      const lat = entry.resource.spacetime.lat;
      const lng = entry.resource.spacetime.lng;
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      const payload = readLodgingPayloadFromResource(entry.resource);
      const isMain = entry.resource.resourceId === activeId;

      return {
        markerKind: "lodging" as const,
        id: `lodging:${entry.resource.resourceId}`,
        resourceId: entry.resource.resourceId,
        label: entry.resource.label,
        lat,
        lng,
        carouselIndex: carouselIndex >= 0 ? carouselIndex : 0,
        isMain,
        thumbnailUrl: payload?.images[0] ?? null,
      };
    })
    .filter((row): row is GlobeLodgingMapMarker => row != null);
}
