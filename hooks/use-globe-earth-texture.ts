"use client";

import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import type { GlobeEquirectTextureState } from "@/hooks/use-globe-equirect-texture";
import { useGlobeEquirectTexture } from "@/hooks/use-globe-equirect-texture";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";

export type GlobeEarthMapVariant = "satellite" | "toss";

export type GlobeEarthTextureState = GlobeEquirectTextureState;

/** Full-earth equirect texture for 2D SpatialGlobeStage. */
export function useGlobeEarthTexture(
  variant: GlobeEarthMapVariant = "satellite",
): GlobeEarthTextureState {
  if (variant === "toss") {
    return useGlobeEquirectTexture(
      GLOBE_TOSS_THEME.sharedGlobeMapStyle,
      GLOBE_TOSS_THEME.overviewTextureZoom,
      GLOBE_TOSS_THEME.overviewTextureWidth,
      GLOBE_TOSS_THEME.overviewTextureHeight,
    );
  }
  return useGlobeEquirectTexture("satellite" satisfies GlobeMapTileStyle);
}
