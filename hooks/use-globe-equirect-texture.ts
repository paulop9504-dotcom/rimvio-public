"use client";

import { useEffect, useState } from "react";
import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import {
  GLOBE_EQ_HEIGHT,
  GLOBE_EQ_WIDTH,
  GLOBE_TEXTURE_ZOOM,
} from "@/lib/experience-graph/reproject-mercator-to-equirectangular";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import {
  buildGlobeEquirectTextureUrl,
  readGlobeEquirectCache,
} from "@/lib/globe/build-globe-equirect-texture";

export type GlobeEquirectTextureState = {
  textureUrl: string | null;
  loading: boolean;
  error: string | null;
};

/** Build a cached full-earth equirectangular texture for globe.gl `globeImageUrl`. */
export function useGlobeEquirectTexture(
  style: GlobeMapTileStyle,
  zoom = GLOBE_TEXTURE_ZOOM,
  outputWidth = GLOBE_EQ_WIDTH,
  outputHeight = GLOBE_EQ_HEIGHT,
): GlobeEquirectTextureState {
  const [textureUrl, setTextureUrl] = useState<string | null>(() =>
    readGlobeEquirectCache(style, zoom, outputWidth, outputHeight),
  );
  const [loading, setLoading] = useState(!textureUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (textureUrl) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void buildGlobeEquirectTextureUrl(style, zoom, outputWidth, outputHeight)
      .then((url) => {
        if (cancelled) {
          return;
        }
        setTextureUrl(url);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "texture_build_failed");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [style, textureUrl, zoom, outputWidth, outputHeight]);

  return { textureUrl, loading, error };
}

/** Toss overview — Voyager mosaic at max safe resolution. */
export function useGlobeOverviewTexture(): GlobeEquirectTextureState {
  return useGlobeEquirectTexture(
    GLOBE_TOSS_THEME.overviewMapStyle,
    GLOBE_TOSS_THEME.overviewTextureZoom,
    GLOBE_TOSS_THEME.overviewTextureWidth,
    GLOBE_TOSS_THEME.overviewTextureHeight,
  );
}
