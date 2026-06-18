import { buildSpatialGlobeView } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";

/** Empty shared globe — world view; focus latest pin when pins exist. */
export function globeViewForSharedPins(
  pins: readonly ClassifiedGlobePin[],
): SpatialGlobeView {
  if (pins.length === 0) {
    return buildSpatialGlobeView({
      lat: 20,
      lng: 0,
      placeLabel: "우리 지구",
      zoom: 1.05,
    });
  }

  const focus = pins[pins.length - 1]!;
  return buildSpatialGlobeView({
    lat: focus.lat,
    lng: focus.lng,
    placeLabel:
      pins.length === 1
        ? focus.label
        : `${focus.label} · 핀 ${pins.length}개`,
    zoom: pins.length === 1 ? 1.65 : 1.35,
  });
}
