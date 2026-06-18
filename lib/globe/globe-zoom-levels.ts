export const GLOBE_ALTITUDE = {
  overview: 2.2,
  region: 0.85,
  city: 0.14,
  /** Apartment-district scale — roads + block labels. */
  neighborhood: 0.018,
  /** Street names legible — Toss map detail. */
  street: 0.0045,
  /** Building / alley — max tile zoom z20. */
  pin: 0.0012,
} as const;

/** Do not pinch closer — camera near-plane + globe.gl minDistance floor. */
export const GLOBE_MIN_SAFE_ALTITUDE = 0.001;

export type GlobeDetailLevel =
  | "space"
  | "region"
  | "city"
  | "neighborhood"
  | "street"
  | "pin";

/** @deprecated Use `pin` */
export type GlobeStreetDetailLevel = "pin";

export function resolveGlobeDetailLevel(altitude: number): GlobeDetailLevel {
  if (altitude >= 1.4) {
    return "space";
  }
  if (altitude >= 0.42) {
    return "region";
  }
  if (altitude >= 0.065) {
    return "city";
  }
  if (altitude >= 0.01) {
    return "neighborhood";
  }
  if (altitude >= 0.0025) {
    return "street";
  }
  return "pin";
}

export function altitudeForGlobeDetailLevel(level: GlobeDetailLevel): number {
  return GLOBE_ALTITUDE[level === "space" ? "overview" : level];
}
