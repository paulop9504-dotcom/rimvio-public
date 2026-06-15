import type { GlobeInstance } from "globe.gl";
import type { GlobeContextWarmthPoint } from "@/lib/globe/globe-context-warmth-types";
import {
  resolveGlobeContextWarmthBandwidth,
  resolveGlobeContextWarmthHeatmapSaturation,
  resolveGlobeContextWarmthOpacity,
  shouldRenderGlobeContextWarmth,
  warmthColorForDensity,
} from "@/lib/globe/globe-context-warmth-visual";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

const WARMTH_SURFACE_ALTITUDE = 0.003;

export type GlobeContextWarmthLayerState = {
  active: boolean;
  pointCount: number;
  layerOpacity: number;
};

export function syncGlobeContextWarmthLayer(input: {
  globe: GlobeInstance;
  enabled: boolean;
  points: readonly GlobeContextWarmthPoint[];
  altitude: number;
  detailLevel?: GlobeDetailLevel;
}): GlobeContextWarmthLayerState {
  const pointCount = input.points.length;
  const visible = shouldRenderGlobeContextWarmth({
    enabled: input.enabled,
    pointCount,
    altitude: input.altitude,
    detailLevel: input.detailLevel,
  });
  const layerOpacity = resolveGlobeContextWarmthOpacity(input.altitude);
  if (!visible) {
    input.globe.heatmapsData([]);
    return { active: false, pointCount, layerOpacity: 0 };
  }

  const bandwidth = resolveGlobeContextWarmthBandwidth(input.altitude);
  const saturation = resolveGlobeContextWarmthHeatmapSaturation(pointCount);

  input.globe
    .heatmapsData([{ id: "personal", points: [...input.points] }])
    .heatmapPoints((row: { points: GlobeContextWarmthPoint[] }) => row.points)
    .heatmapPointLat((point: GlobeContextWarmthPoint) => point.lat)
    .heatmapPointLng((point: GlobeContextWarmthPoint) => point.lng)
    .heatmapPointWeight((point: GlobeContextWarmthPoint) => point.weight)
    .heatmapBandwidth(bandwidth)
    .heatmapColorSaturation(saturation)
    .heatmapColorFn(() => (t: number) => warmthColorForDensity(t, layerOpacity))
    .heatmapBaseAltitude(WARMTH_SURFACE_ALTITUDE)
    .heatmapTopAltitude(WARMTH_SURFACE_ALTITUDE)
    .heatmapsTransitionDuration(0);

  return { active: true, pointCount, layerOpacity };
}
