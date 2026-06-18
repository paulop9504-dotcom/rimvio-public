import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

export type GlobePinLabelStyle = {
  show: boolean;
  size: number;
  dotRadius: number;
  resolution: number;
  altitude: number;
};

/**
 * WebGL labels use Helvetiker — no Korean glyphs (renders as giant `?` bands).
 * Pin copy lives on HTML cards only; map place names come from CARTO tiles.
 */
export function resolveGlobePinLabelStyle(_level: GlobeDetailLevel): GlobePinLabelStyle {
  return {
    show: false,
    size: 0.5,
    dotRadius: 0.1,
    resolution: 2,
    altitude: 0.002,
  };
}
