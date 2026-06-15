/** Client UX events — surface layer only (not canonical truth). */
export const SURFACE_IGNORE_OBSERVED_EVENT = "rimvio:surface-ignore-observed" as const;

export type SurfaceIgnoreObservedDetail = {
  surfaceId: string;
  capabilityId: string;
};
