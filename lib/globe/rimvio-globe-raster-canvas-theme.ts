import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";

/** 3D globe raster tile — calm canvas; pins stay hero. */
export const RIMVIO_GLOBE_RASTER_CANVAS = {
  land: { r: 240, g: 241, b: 243 },
  park: { r: 232, g: 242, b: 232 },
  water: { r: 212, g: 226, b: 238 },
  /** Softer road gray on calm land. */
  road: { r: 100, g: 104, b: 110 },
  /** Street / water labels — keep readable. */
  labelInkMax: 54,
  shell: GLOBE_TOSS_THEME.shellBg,
} as const;

export const RIMVIO_GLOBE_ROAD_DARK_GRAY = RIMVIO_GLOBE_RASTER_CANVAS.road;
