import {
  formatEnvironmentLabel,
  formatSpatialTimeLabel,
  seasonLabel,
  timeOfDayLabel,
} from "@/lib/experience-graph/derive-media-environment";
import type {
  SpatialContextFrame,
  SpatialMediaItem,
} from "@/lib/experience-graph/spatial-media-types";

/** Pure read — one media item → synchronized globe + time + environment frame. */
export function buildSpatialContextFrame(item: SpatialMediaItem): SpatialContextFrame {
  const timeLabel = formatSpatialTimeLabel(item.capturedAtIso) ?? "시간 미정";

  return {
    mediaId: item.id,
    placeLabel: item.placeLabel,
    clusterId: item.clusterId,
    lat: item.lat,
    lng: item.lng,
    capturedAtIso: item.capturedAtIso,
    timeLabel,
    timeOfDay: item.timeOfDay,
    timeOfDayLabel: timeOfDayLabel(item.timeOfDay),
    season: item.season,
    seasonLabel: seasonLabel(item.season),
    weatherCondition: item.weatherCondition,
    environmentLabel: formatEnvironmentLabel({
      timeOfDay: item.timeOfDay,
      season: item.season,
      weatherLabel: item.weatherLabel,
      temperatureC: item.temperatureC,
    }),
    temperatureC: item.temperatureC,
  };
}
