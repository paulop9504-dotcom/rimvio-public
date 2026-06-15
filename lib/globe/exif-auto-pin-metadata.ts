import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

export const EXIF_AUTO_PINNED_META_KEY = "exifAutoPinned";

/** Stamp EXIF GPS on event metadata — map pin lands on capture coords. */
export function buildExifAutoPinMetadata(
  context: MediaSpacetimeContext,
): Record<string, unknown> | null {
  if (context.resolveSource !== "exif_gps") {
    return null;
  }
  const lat = context.lat;
  const lng = context.lng;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const label = context.placeLabel?.trim() || undefined;

  return {
    [EXIF_AUTO_PINNED_META_KEY]: true,
    targetingSource: "exif_auto_pin",
    globePlaceConfirmed: true,
    globePlaceLat: lat,
    globePlaceLng: lng,
    ...(label ? { globePlaceLabel: label, globePlaceCardLabel: label } : {}),
    globePlaceCardLat: lat,
    globePlaceCardLng: lng,
  };
}

export function mergeExifAutoPinOntoEvent<T extends { metadata?: Record<string, unknown>; place?: string }>(
  event: T,
  context: MediaSpacetimeContext,
): T {
  const patch = buildExifAutoPinMetadata(context);
  if (!patch) {
    return event;
  }
  const label = context.placeLabel?.trim();
  return {
    ...event,
    place: label || event.place,
    metadata: {
      ...(event.metadata ?? {}),
      ...patch,
    },
  };
}
