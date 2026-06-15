import {
  remapRimvioGlobeRoadPixels,
  resolveCartoRoadRecolorStrength,
} from "@/lib/globe/remap-rimvio-globe-road-pixels";
import { RIMVIO_GLOBE_RASTER_CANVAS } from "@/lib/globe/rimvio-globe-raster-canvas-theme";

const { land, park, water, labelInkMax } = RIMVIO_GLOBE_RASTER_CANVAS;

function isLabelInkPixel(r: number, g: number, b: number): boolean {
  return Math.max(r, g, b) <= labelInkMax;
}

function isWaterPixel(r: number, g: number, b: number): boolean {
  if (b > r + 8 && b >= g - 2) {
    return true;
  }
  if (b > g + 6 && b > r + 4) {
    return true;
  }
  return false;
}

function isParkPixel(r: number, g: number, b: number): boolean {
  if (g > r + 10 && g > b + 6) {
    return true;
  }
  return false;
}

function isNeutralLightLand(r: number, g: number, b: number): boolean {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min > 210 && max - min < 22;
}

function isBuildingOrClutterPixel(
  r: number,
  g: number,
  b: number,
  a: number,
): boolean {
  if (a < 160) {
    return false;
  }
  if (isLabelInkPixel(r, g, b)) {
    return false;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  if (max >= 52 && max <= 168 && chroma < 32) {
    return true;
  }

  if (chroma > 38 && max > 95 && max < 235 && min > 35) {
    if (isParkPixel(r, g, b) || isWaterPixel(r, g, b)) {
      return false;
    }
    return true;
  }

  return false;
}

function isLightStyleRoadPixel(
  r: number,
  g: number,
  b: number,
  a: number,
): number {
  if (a < 180 || isWaterPixel(r, g, b) || isParkPixel(r, g, b)) {
    return 0;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 20) {
    return 0;
  }
  if (max >= 198 && min >= 178) {
    return 0.82;
  }
  if (max >= 170 && max <= 210 && min >= 150) {
    return 0.55;
  }
  return 0;
}

function paintCanvasRegions(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  roadStrength: Float32Array,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (roadStrength[i]! > 0.12) {
        continue;
      }
      const o = i * 4;
      const r = pixels[o]!;
      const g = pixels[o + 1]!;
      const b = pixels[o + 2]!;
      if (isLabelInkPixel(r, g, b)) {
        continue;
      }
      if (isWaterPixel(r, g, b)) {
        pixels[o] = water.r;
        pixels[o + 1] = water.g;
        pixels[o + 2] = water.b;
        continue;
      }
      if (isParkPixel(r, g, b)) {
        pixels[o] = park.r;
        pixels[o + 1] = park.g;
        pixels[o + 2] = park.b;
        continue;
      }
      if (isNeutralLightLand(r, g, b)) {
        pixels[o] = land.r;
        pixels[o + 1] = land.g;
        pixels[o + 2] = land.b;
      }
    }
  }
}

function buildRoadStrength(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  const strength = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * 4;
      const r = pixels[o]!;
      const g = pixels[o + 1]!;
      const b = pixels[o + 2]!;
      const a = pixels[o + 3]!;
      strength[i] = Math.max(
        resolveCartoRoadRecolorStrength(r, g, b, a),
        isLightStyleRoadPixel(r, g, b, a),
      );
    }
  }
  return strength;
}

function removeMapClutter(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  roadStrength: Float32Array,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (roadStrength[i]! > 0.12) {
        continue;
      }
      const o = i * 4;
      const r = pixels[o]!;
      const g = pixels[o + 1]!;
      const b = pixels[o + 2]!;
      const a = pixels[o + 3]!;
      if (!isBuildingOrClutterPixel(r, g, b, a)) {
        continue;
      }
      pixels[o] = land.r;
      pixels[o + 1] = land.g;
      pixels[o + 2] = land.b;
    }
  }
}

function removeIsolatedSpeckles(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  roadStrength: Float32Array,
): void {
  const next = new Uint8ClampedArray(pixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (roadStrength[i]! > 0.12) {
        continue;
      }
      const o = i * 4;
      const r = pixels[o]!;
      const g = pixels[o + 1]!;
      const b = pixels[o + 2]!;
      if (isLabelInkPixel(r, g, b)) {
        continue;
      }
      const max = Math.max(r, g, b);
      if (max > 175 || max < 58) {
        continue;
      }
      let darkNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          const ni = ny * width + nx;
          const no = ni * 4;
          const nmax = Math.max(pixels[no]!, pixels[no + 1]!, pixels[no + 2]!);
          if (nmax >= 58 && nmax <= 175) {
            darkNeighbors += 1;
          }
        }
      }
      if (darkNeighbors >= 3) {
        continue;
      }
      next[o] = land.r;
      next[o + 1] = land.g;
      next[o + 2] = land.b;
    }
  }
  pixels.set(next);
}

/** Full Rimvio canvas pass on a slippy-map tile. */
export function applyRimvioGlobeMapTileCanvas(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): void {
  if (width <= 1 && height <= 1) {
    remapRimvioGlobeRoadPixels(pixels, width, height);
    return;
  }

  const roadStrength = buildRoadStrength(pixels, width, height);
  paintCanvasRegions(pixels, width, height, roadStrength);
  remapRimvioGlobeRoadPixels(pixels, width, height);
  removeMapClutter(pixels, width, height, roadStrength);
  removeIsolatedSpeckles(pixels, width, height, roadStrength);
}
