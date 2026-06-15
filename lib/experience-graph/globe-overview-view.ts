import { buildSpatialGlobeView } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";

/** globe.gl camera — altitude ≈ 2.2 shows the full planet from space. */
export const GLOBE_OVERVIEW_POINT_OF_VIEW = {
  lat: 12,
  lng: 25,
  altitude: 2.2,
} as const;

/** Google Earth–style startup — full globe, equatorial, slow spin friendly. */
export function buildGlobeOverviewView(input?: {
  pinCount?: number;
  placeLabel?: string;
}): SpatialGlobeView {
  const pinCount = input?.pinCount ?? 0;
  const placeLabel =
    input?.placeLabel?.trim() ||
    (pinCount > 0 ? `내 지구 · 핀 ${pinCount}개` : "지구");

  return buildSpatialGlobeView({
    lat: 12,
    lng: 25,
    placeLabel,
    zoom: 0.76,
  });
}
