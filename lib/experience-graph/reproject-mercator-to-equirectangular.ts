const TILE_SIZE = 256;

export const GLOBE_TEXTURE_ZOOM = 2;
export const GLOBE_EQ_WIDTH = 1024;
export const GLOBE_EQ_HEIGHT = 512;

/** Web Mercator limits — avoid pole singularity when sampling tiles. */
export function clampGlobeLatitude(lat: number): number {
  return Math.min(85.05112878, Math.max(-85.05112878, lat));
}

/** Lat/lng → floating pixel on a Web Mercator tile canvas at zoom. */
export function latLngToMercatorPixel(
  lat: number,
  lng: number,
  zoom: number,
  tileSize = TILE_SIZE,
): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n * tileSize;
  const latRad = (clampGlobeLatitude(lat) * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n *
    tileSize;
  return { x, y };
}

/** Equirectangular pixel → lat/lng. */
export function equirectangularPixelToLatLng(
  x: number,
  y: number,
  width: number,
  height: number,
): { lat: number; lng: number } {
  const lng = (x / width) * 360 - 180;
  const lat = 90 - (y / height) * 180;
  return { lat: clampGlobeLatitude(lat), lng };
}

function sampleMercatorBilinear(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const clampedX = Math.min(width - 1.001, Math.max(0, x));
  const clampedY = Math.min(height - 1.001, Math.max(0, y));
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = clampedX - x0;
  const ty = clampedY - y0;

  const idx = (px: number, py: number) => (py * width + px) * 4;
  const sample = (px: number, py: number) => {
    const i = idx(px, py);
    return [
      pixels[i]!,
      pixels[i + 1]!,
      pixels[i + 2]!,
      pixels[i + 3]!,
    ] as const;
  };

  const c00 = sample(x0, y0);
  const c10 = sample(x1, y0);
  const c01 = sample(x0, y1);
  const c11 = sample(x1, y1);

  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return [
    Math.round(mix(mix(c00[0], c10[0], tx), mix(c01[0], c11[0], tx), ty)),
    Math.round(mix(mix(c00[1], c10[1], tx), mix(c01[1], c11[1], tx), ty)),
    Math.round(mix(mix(c00[2], c10[2], tx), mix(c01[2], c11[2], tx), ty)),
    Math.round(mix(mix(c00[3], c10[3], tx), mix(c01[3], c11[3], tx), ty)),
  ];
}

/** Mercator tile mosaic → equirectangular satellite texture (2:1). */
export function reprojectMercatorMosaicToEquirectangular(input: {
  mercatorPixels: Uint8ClampedArray;
  mercatorWidth: number;
  mercatorHeight: number;
  zoom: number;
  outputWidth?: number;
  outputHeight?: number;
}): Uint8ClampedArray {
  const outputWidth = input.outputWidth ?? GLOBE_EQ_WIDTH;
  const outputHeight = input.outputHeight ?? GLOBE_EQ_HEIGHT;
  const out = new Uint8ClampedArray(outputWidth * outputHeight * 4);

  for (let ey = 0; ey < outputHeight; ey++) {
    for (let ex = 0; ex < outputWidth; ex++) {
      const { lat, lng } = equirectangularPixelToLatLng(
        ex,
        ey,
        outputWidth,
        outputHeight,
      );
      const mercator = latLngToMercatorPixel(lat, lng, input.zoom);
      const [r, g, b, a] = sampleMercatorBilinear(
        input.mercatorPixels,
        input.mercatorWidth,
        input.mercatorHeight,
        mercator.x,
        mercator.y,
      );
      const outIdx = (ey * outputWidth + ex) * 4;
      out[outIdx] = r;
      out[outIdx + 1] = g;
      out[outIdx + 2] = b;
      out[outIdx + 3] = a;
    }
  }

  return out;
}

export function listMercatorTileCoords(zoom: number): Array<{ x: number; y: number }> {
  const n = 2 ** zoom;
  const coords: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      coords.push({ x, y });
    }
  }
  return coords;
}
