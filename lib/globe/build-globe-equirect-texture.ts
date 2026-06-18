import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import {
  GLOBE_EQ_HEIGHT,
  GLOBE_EQ_WIDTH,
  GLOBE_TEXTURE_ZOOM,
  listMercatorTileCoords,
  reprojectMercatorMosaicToEquirectangular,
} from "@/lib/experience-graph/reproject-mercator-to-equirectangular";

const TILE_SIZE = 256;
const TILE_LOAD_BATCH = 48;
const MAX_TEXTURE_CACHE_ENTRIES = 2;
const TEXTURE_CACHE = new Map<string, string>();

import { GLOBE_TILE_CANVAS_VERSION } from "@/lib/globe/globe-tile-engine-url";

function tileProxyUrl(z: number, x: number, y: number, style: GlobeMapTileStyle): string {
  return `/api/globe/tile?z=${z}&x=${x}&y=${y}&style=${style}&v=${GLOBE_TILE_CANVAS_VERSION}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`tile_load_failed:${src}`));
    img.src = src;
  });
}

async function loadTileImage(
  z: number,
  x: number,
  y: number,
  style: GlobeMapTileStyle,
): Promise<HTMLImageElement> {
  return loadImage(tileProxyUrl(z, x, y, style));
}

/** Post-process contrast on overview mosaic — S-curve via CSS filter (no per-pixel edits). */
function postProcessOverviewCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d");
  if (!ctx) {
    return source;
  }
  ctx.filter = "contrast(1.16) saturate(0.9) brightness(0.98)";
  ctx.drawImage(source, 0, 0);
  return out;
}

export function globeEquirectCacheKey(
  style: GlobeMapTileStyle,
  zoom = GLOBE_TEXTURE_ZOOM,
  outputWidth = GLOBE_EQ_WIDTH,
  outputHeight = GLOBE_EQ_HEIGHT,
): string {
  return `${style}-eq-v8-z${zoom}-${outputWidth}x${outputHeight}`;
}

function rememberTextureCache(key: string, url: string): void {
  if (TEXTURE_CACHE.has(key)) {
    TEXTURE_CACHE.delete(key);
  }
  TEXTURE_CACHE.set(key, url);
  while (TEXTURE_CACHE.size > MAX_TEXTURE_CACHE_ENTRIES) {
    const oldest = TEXTURE_CACHE.keys().next().value;
    if (!oldest) {
      break;
    }
    TEXTURE_CACHE.delete(oldest);
  }
}

export function clearGlobeEquirectCacheForTests(): void {
  TEXTURE_CACHE.clear();
}

export function readGlobeEquirectCache(
  style: GlobeMapTileStyle,
  zoom = GLOBE_TEXTURE_ZOOM,
  outputWidth = GLOBE_EQ_WIDTH,
  outputHeight = GLOBE_EQ_HEIGHT,
): string | null {
  return TEXTURE_CACHE.get(globeEquirectCacheKey(style, zoom, outputWidth, outputHeight)) ?? null;
}

/** Full-earth equirectangular mosaic — Voyager for Toss overview, satellite for legacy 2D. */
export async function buildGlobeEquirectTextureUrl(
  style: GlobeMapTileStyle,
  zoom = GLOBE_TEXTURE_ZOOM,
  outputWidth = GLOBE_EQ_WIDTH,
  outputHeight = GLOBE_EQ_HEIGHT,
): Promise<string> {
  const cacheKey = globeEquirectCacheKey(style, zoom, outputWidth, outputHeight);
  const cached = TEXTURE_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const n = 2 ** zoom;
  const mosaicWidth = n * TILE_SIZE;
  const mosaicHeight = n * TILE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = mosaicWidth;
  canvas.height = mosaicHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas_context_unavailable");
  }

  const coords = listMercatorTileCoords(zoom);
  for (let index = 0; index < coords.length; index += TILE_LOAD_BATCH) {
    const batch = coords.slice(index, index + TILE_LOAD_BATCH);
    await Promise.all(
      batch.map(async ({ x, y }) => {
        const img = await loadTileImage(zoom, x, y, style);
        ctx.drawImage(img, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }),
    );
  }

  const mosaic = ctx.getImageData(0, 0, mosaicWidth, mosaicHeight);
  const equirect = reprojectMercatorMosaicToEquirectangular({
    mercatorPixels: mosaic.data,
    mercatorWidth: mosaicWidth,
    mercatorHeight: mosaicHeight,
    zoom,
    outputWidth,
    outputHeight,
  });

  const output = document.createElement("canvas");
  output.width = outputWidth;
  output.height = outputHeight;
  const outputCtx = output.getContext("2d");
  if (!outputCtx) {
    throw new Error("canvas_context_unavailable");
  }
  outputCtx.putImageData(
    new ImageData(equirect, outputWidth, outputHeight),
    0,
    0,
  );

  if (style !== "satellite") {
    const exportCanvas = postProcessOverviewCanvas(output);
    const url = exportCanvas.toDataURL("image/png");
    rememberTextureCache(cacheKey, url);
    return url;
  }

  const url = output.toDataURL("image/jpeg", 0.92);
  rememberTextureCache(cacheKey, url);
  return url;
}
