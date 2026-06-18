import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { GLOBE_TILE_MAX_ZOOM } from "@/lib/globe/globe-tile-constants";

const CARTO_SUBDOMAINS = ["a", "b", "c", "d"] as const;

const UPSTREAM_URLS: Record<GlobeMapTileStyle, string> = {
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  voyager: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
};

export function resolveGlobeTileUpstreamUrl(input: {
  z: number;
  x: number;
  y: number;
  style: GlobeMapTileStyle;
}): string | null {
  const template = UPSTREAM_URLS[input.style];
  if (!template) {
    return null;
  }
  const z = Math.max(0, Math.min(GLOBE_TILE_MAX_ZOOM, Math.floor(input.z)));
  const n = 2 ** z;
  const x = ((Math.floor(input.x) % n) + n) % n;
  const y = Math.max(0, Math.min(n - 1, Math.floor(input.y)));
  const subdomain =
    input.style === "satellite"
      ? ""
      : CARTO_SUBDOMAINS[(x + y) % CARTO_SUBDOMAINS.length]!;
  return template
    .replace("{s}", subdomain)
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}
