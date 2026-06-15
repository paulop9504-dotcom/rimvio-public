import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";

export function shouldRemapRimvioGlobeMapTileStyle(_style: GlobeMapTileStyle): boolean {
  return false;
}

/** Pass-through — server-side pixel edits caused tile seam glitches on the 3D globe. */
export function remapRimvioGlobeMapTilePng(bytes: Buffer): Buffer {
  return bytes;
}
