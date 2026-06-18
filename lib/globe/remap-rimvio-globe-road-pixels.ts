/** Rimvio 3D globe — warm CARTO road ink → dark gray canvas. */
export { RIMVIO_GLOBE_ROAD_DARK_GRAY } from "@/lib/globe/rimvio-globe-raster-canvas-theme";
import { RIMVIO_GLOBE_ROAD_DARK_GRAY } from "@/lib/globe/rimvio-globe-raster-canvas-theme";

const ROAD_COLOR_MATCH_TOLERANCE = 22;

function isParkOrWaterPixel(r: number, g: number, b: number): boolean {
  if (g > r + 12 && g > b + 8) {
    return true;
  }
  if (b > r + 6 && b >= g - 4) {
    return true;
  }
  return false;
}

function isNeutralNearWhite(r: number, g: number, b: number): boolean {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min > 226 && max - min < 16;
}

function isCartoRoadCasingPixel(
  r: number,
  g: number,
  b: number,
  a: number,
): boolean {
  if (a < 180) {
    return false;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max > 165 || max < 52) {
    return false;
  }
  if (max - min > 24) {
    return false;
  }
  return true;
}

/** Voyager / light raster — yellow, orange, cream, pale motorway fills. */
export function isCartoWarmRoadPixel(
  r: number,
  g: number,
  b: number,
  a: number,
): boolean {
  return resolveCartoRoadRecolorStrength(r, g, b, a) >= 0.55;
}

/** 0–1 — keeps anti-aliased road edges when recoloring. */
export function resolveCartoRoadRecolorStrength(
  r: number,
  g: number,
  b: number,
  a: number,
): number {
  if (a < 180) {
    return 0;
  }
  if (isParkOrWaterPixel(r, g, b)) {
    return 0;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 135) {
    return 0;
  }
  if (min > 247) {
    return 0;
  }

  const warmDelta = r - b;
  const greenLead = g - b;
  if (warmDelta < 8) {
    if (isCartoRoadCasingPixel(r, g, b, a)) {
      return 0.92;
    }
    return 0;
  }

  let strength = 0;
  if (r > 220 && g > 165 && b < 125 && warmDelta > 45) {
    strength = 1;
  } else if (r > 175 && g > 135 && b < 145 && warmDelta > 28 && g > b + 8) {
    strength = 1;
  } else if (r > 205 && g > 195 && b > 155 && warmDelta > 24 && greenLead > 16) {
    strength = 1;
  } else if (r > 228 && g > 218 && b > 165 && warmDelta > 35) {
    strength = 1;
  } else if (r > 240 && g > 232 && b > 188 && warmDelta > 28 && g >= b + 20) {
    strength = 1;
  } else {
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (
      r >= g - 2 &&
      g >= b - 6 &&
      warmDelta > 14 &&
      saturation > 0.03 &&
      saturation < 0.34
    ) {
      strength = Math.min(1, (warmDelta - 8) / 34);
    }
  }

  return strength;
}

function strengthAt(
  strength: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return 0;
  }
  return strength[y * width + x] ?? 0;
}

function matchesRoadColor(r: number, g: number, b: number): boolean {
  const { r: tr, g: tg, b: tb } = RIMVIO_GLOBE_ROAD_DARK_GRAY;
  return (
    Math.abs(r - tr) <= ROAD_COLOR_MATCH_TOLERANCE &&
    Math.abs(g - tg) <= ROAD_COLOR_MATCH_TOLERANCE &&
    Math.abs(b - tb) <= ROAD_COLOR_MATCH_TOLERANCE
  );
}

function roadPresenceAt(
  pixels: Uint8Array | Uint8ClampedArray,
  strength: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  if (strengthAt(strength, width, height, x, y) >= 0.35) {
    return true;
  }
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return false;
  }
  const o = (y * width + x) * 4;
  return matchesRoadColor(pixels[o]!, pixels[o + 1]!, pixels[o + 2]!);
}

function fillRoadInteriorWhites(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  strength: Float32Array,
): void {
  const { r, g, b } = RIMVIO_GLOBE_ROAD_DARK_GRAY;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * 4;
      const pr = pixels[o]!;
      const pg = pixels[o + 1]!;
      const pb = pixels[o + 2]!;
      if (!isNeutralNearWhite(pr, pg, pb)) {
        continue;
      }
      let roadNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          if (roadPresenceAt(pixels, strength, width, height, x + dx, y + dy)) {
            roadNeighbors += 1;
          }
        }
      }
      if (roadNeighbors < 2) {
        continue;
      }
      pixels[o] = r;
      pixels[o + 1] = g;
      pixels[o + 2] = b;
      strength[i] = 1;
    }
  }
}

function softenRimvioGlobeRoadEdges(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  strength: Float32Array,
): void {
  const blurMask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (strength[i]! >= 0.2) {
        blurMask[i] = 1;
        continue;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (strengthAt(strength, width, height, x + dx, y + dy) >= 0.45) {
            blurMask[i] = 1;
            break;
          }
        }
        if (blurMask[i]) {
          break;
        }
      }
    }
  }

  const next = new Uint8ClampedArray(pixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!blurMask[i]) {
        continue;
      }
      const o = i * 4;
      if (
        strength[i]! < 0.15 &&
        !matchesRoadColor(pixels[o]!, pixels[o + 1]!, pixels[o + 2]!)
      ) {
        continue;
      }
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          const ni = ny * width + nx;
          const no = ni * 4;
          const nr = pixels[no]!;
          const ng = pixels[no + 1]!;
          const nb = pixels[no + 2]!;
          if (strength[ni]! < 0.12 && !matchesRoadColor(nr, ng, nb)) {
            continue;
          }
          sr += nr;
          sg += pixels[no + 1]!;
          sb += pixels[no + 2]!;
          count += 1;
        }
      }
      if (count === 0) {
        continue;
      }
      next[o] = Math.round(sr / count);
      next[o + 1] = Math.round(sg / count);
      next[o + 2] = Math.round(sb / count);
    }
  }

  pixels.set(next);
}

export function remapRimvioGlobeRoadPixels(
  pixels: Uint8Array | Uint8ClampedArray,
  width = 1,
  height = Math.max(1, Math.floor(pixels.length / 4)),
): void {
  const { r, g, b } = RIMVIO_GLOBE_ROAD_DARK_GRAY;
  const strength = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * 4;
      const pr = pixels[o]!;
      const pg = pixels[o + 1]!;
      const pb = pixels[o + 2]!;
      const pa = pixels[o + 3]!;
      const s = resolveCartoRoadRecolorStrength(pr, pg, pb, pa);
      strength[i] = s;
      if (s <= 0) {
        continue;
      }
      pixels[o] = Math.round(pr * (1 - s) + r * s);
      pixels[o + 1] = Math.round(pg * (1 - s) + g * s);
      pixels[o + 2] = Math.round(pb * (1 - s) + b * s);
    }
  }

  if (width > 1 || height > 1) {
    fillRoadInteriorWhites(pixels, width, height, strength);
    softenRimvioGlobeRoadEdges(pixels, width, height, strength);
  }
}

export function isRimvioGlobeRoadPixel(r: number, g: number, b: number): boolean {
  return matchesRoadColor(r, g, b);
}
