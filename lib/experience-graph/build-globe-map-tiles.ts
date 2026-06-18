import { resolveGlobeTileUpstreamUrl } from "@/lib/experience-graph/resolve-globe-tile-upstream";

const TILE_SIZE = 256;

export type GlobeMapTileStyle = "satellite" | "voyager" | "light";

/** Flat 2D loads CARTO directly — proxy auth/rate-limit flakes break `<img>` tiles on mobile. */
export type GlobeMapTileDelivery = "proxy" | "direct";

/** Client tiles load via same-origin proxy (avoids hotlink/CORS flakes). */
const TILE_PROXY_PATH = "/api/globe/tile";

const TILE_ATTRIBUTION: Record<GlobeMapTileStyle, string> = {
  satellite: "© Esri · Maxar",
  voyager: "© OSM · CARTO",
  light: "© OSM · CARTO",
};

export type GlobeMapTile = {
  key: string;
  url: string;
};

export type GlobeMapTileGrid = {
  tiles: readonly GlobeMapTile[];
  /** Pixel offset so lat/lng sits at the grid focal point. */
  focalOffsetX: number;
  focalOffsetY: number;
  gridPx: number;
  zoom: number;
};

function latLngToTileFloat(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y, n };
}

/** SpatialGlobeView.zoom is a CSS scale — map to slippy-map zoom. */
export function resolveGlobeMapZoom(
  globeZoom: number,
  tileStyle: GlobeMapTileStyle = "satellite",
): number {
  if (tileStyle === "satellite") {
    return Math.min(10, Math.max(4, Math.round(3 + globeZoom * 2.2)));
  }
  return Math.min(GLOBE_TILE_MAX_ZOOM, Math.max(5, Math.round(5 + globeZoom * 3.4)));
}

export function globeMapTileAttribution(tileStyle: GlobeMapTileStyle): string {
  return TILE_ATTRIBUTION[tileStyle];
}

export function buildGlobeMapTileUrl(
  z: number,
  x: number,
  y: number,
  tileStyle: GlobeMapTileStyle,
  delivery: GlobeMapTileDelivery = "proxy",
): string {
  if (delivery === "direct") {
    return (
      resolveGlobeTileUpstreamUrl({ z, x, y, style: tileStyle }) ??
      `${TILE_PROXY_PATH}?z=${z}&x=${x}&y=${y}&style=${tileStyle}`
    );
  }
  return `${TILE_PROXY_PATH}?z=${z}&x=${x}&y=${y}&style=${tileStyle}`;
}

/** 3×3 tile grid centered on lat/lng for the globe map surface. */
export function buildGlobeMapTileGrid(
  lat: number,
  lng: number,
  zoom: number,
  gridSize = 3,
  tileStyle: GlobeMapTileStyle = "satellite",
  delivery: GlobeMapTileDelivery = "proxy",
): GlobeMapTileGrid {
  const tileStyleParam = tileStyle;
  const { x, y, n } = latLngToTileFloat(lat, lng, zoom);
  const centerX = Math.floor(x);
  const centerY = Math.floor(y);
  const fracX = (x - centerX) * TILE_SIZE;
  const fracY = (y - centerY) * TILE_SIZE;
  const half = Math.floor(gridSize / 2);
  const tiles: GlobeMapTile[] = [];

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const tx = (centerX + dx + n) % n;
      const ty = Math.max(0, Math.min(n - 1, centerY + dy));
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: buildGlobeMapTileUrl(zoom, tx, ty, tileStyleParam, delivery),
      });
    }
  }

  const gridPx = gridSize * TILE_SIZE;
  const focalOffsetX = half * TILE_SIZE + fracX;
  const focalOffsetY = half * TILE_SIZE + fracY;

  return { tiles, focalOffsetX, focalOffsetY, gridPx, zoom };
}
