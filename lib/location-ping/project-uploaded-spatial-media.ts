import {
  formatSpatialTimeLabel,
  inferWeatherForMoment,
  resolveSeason,
  resolveTimeOfDay,
} from "@/lib/experience-graph/derive-media-environment";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";
import { formatCoordsPlaceLabel } from "@/lib/location-ping/format-place-label";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

const VOLUME_FIT_RADIUS_KM = 25;
const VOLUME_TIME_PADDING_MS = 6 * 60 * 60 * 1000;

function parseMs(iso?: string | null): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mediaTitle(context: MediaSpacetimeContext): string {
  if (context.mediaKind === "video") {
    return "업로드한 영상";
  }
  if (context.mediaKind === "photo") {
    return "업로드한 사진";
  }
  return "업로드한 기록";
}

function mediaCaption(context: MediaSpacetimeContext): string {
  const time = formatSpatialTimeLabel(new Date(context.capturedAtIso));
  if (context.placeLabel) {
    return `${context.placeLabel} · ${time}`;
  }
  return time;
}

/** Strict spacetime fit — never attach Shanghai upload to Jeju volume. */
export function fitsUploadedMediaVolume(
  context: MediaSpacetimeContext,
  volume: ExperienceVolume,
  volumeCoords: ReturnType<typeof resolvePlaceCoordinates>,
): boolean {
  const sourceEventId = volume.sourceEventId?.trim();
  const originRef = context.originRef?.trim();
  if (sourceEventId && originRef && originRef === sourceEventId) {
    return true;
  }

  const capturedMs = parseMs(context.capturedAtIso);
  const startMs = parseMs(volume.time.startIso);
  const endMs = parseMs(volume.time.endIso) ?? startMs;
  if (capturedMs === null || startMs === null) {
    return false;
  }

  const windowStart = startMs - VOLUME_TIME_PADDING_MS;
  const windowEnd = (endMs ?? startMs) + VOLUME_TIME_PADDING_MS;
  if (capturedMs < windowStart || capturedMs > windowEnd) {
    return false;
  }

  if (context.lat === null || context.lng === null) {
    return false;
  }

  const distance = haversineKm(
    context.lat,
    context.lng,
    volumeCoords.lat,
    volumeCoords.lng,
  );
  return distance <= VOLUME_FIT_RADIUS_KM;
}

export function projectUploadedSpatialMedia(
  contexts: readonly MediaSpacetimeContext[],
  volume: ExperienceVolume,
): SpatialMediaItem[] {
  const volumeCoords = resolvePlaceCoordinates(volume.space.label);

  return contexts
    .filter((context) => fitsUploadedMediaVolume(context, volume, volumeCoords))
    .map((context) => {
      const date = new Date(context.capturedAtIso);
      const timeOfDay = resolveTimeOfDay(date);
      const season = resolveSeason(date);
      const placeLabel =
        context.placeLabel ??
        (context.lat !== null && context.lng !== null
          ? formatCoordsPlaceLabel(context.lat, context.lng)
          : volumeCoords.label);
      const weather = inferWeatherForMoment({
        season,
        timeOfDay,
        placeLabel,
      });

      return {
        id: `upload:${context.id}`,
        kind: context.mediaKind === "video" ? "video" : "photo",
        title: mediaTitle(context),
        caption: mediaCaption(context),
        capturedAtIso: context.capturedAtIso,
        placeLabel,
        clusterId: volume.space.clusterId,
        lat: context.lat ?? volumeCoords.lat,
        lng: context.lng ?? volumeCoords.lng,
        timeOfDay,
        season,
        weatherCondition: weather.condition,
        weatherLabel: weather.label,
        temperatureC: weather.temperatureC,
        peakId: null,
        durationSec: context.mediaKind === "video" ? 30 : null,
      } satisfies SpatialMediaItem;
    });
}
