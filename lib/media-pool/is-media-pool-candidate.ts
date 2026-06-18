import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

/** True when capture has embedded GPS — travel route auto-pin stays enabled. */
export function hasExifGpsCapture(context: MediaSpacetimeContext): boolean {
  return context.resolveSource === "exif_gps";
}

/**
 * GPS-less screenshots / edited photos — stage to pool instead of auto moment.
 * Pin-card uploads (`forceAttachToHint`) bypass the pool.
 */
export function shouldStageMediaToPool(input: {
  context: MediaSpacetimeContext;
  forceAttachToHint?: boolean;
  /** Bulk cluster LLM inferred place — skip pool staging. */
  bulkClusterPlaceLabel?: string | null;
}): boolean {
  if (input.forceAttachToHint) {
    return false;
  }
  if (input.bulkClusterPlaceLabel?.trim()) {
    return false;
  }
  if (input.context.poolStatus === "staged") {
    return false;
  }
  return !hasExifGpsCapture(input.context);
}
