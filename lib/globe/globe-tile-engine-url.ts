import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { GLOBE_TILE_MAX_ZOOM } from "@/lib/globe/globe-tile-constants";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";

/** Bump when tile post-process (road recolor) changes — bust CDN cache. */
export const GLOBE_TILE_CANVAS_VERSION = 7;

/** Slippy-map tile URL for globe.gl `globeTileEngineUrl`. */
export function buildGlobeTileEngineUrl(
  x: number,
  y: number,
  level: number,
  style: GlobeMapTileStyle = "satellite",
): string {
  const z = Math.max(0, Math.min(GLOBE_TILE_MAX_ZOOM, Math.floor(level)));
  const n = 2 ** z;
  const tx = ((Math.floor(x) % n) + n) % n;
  const ty = Math.max(0, Math.min(n - 1, Math.floor(y)));
  return `/api/globe/tile?z=${z}&x=${tx}&y=${ty}&style=${style}&v=${GLOBE_TILE_CANVAS_VERSION}`;
}

/** Home globe — CARTO light tiles (Toss-style streets). */
export function resolveGlobeTileStyleForLevel(_level: number): GlobeMapTileStyle {
  return GLOBE_TOSS_THEME.mapStyle;
}

export function globeTileEngineUrl(x: number, y: number, level: number): string {
  return buildGlobeTileEngineUrl(x, y, level, resolveGlobeTileStyleForLevel(level));
}
