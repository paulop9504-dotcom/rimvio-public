import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { projectLatLngToMapPercent } from "@/lib/experience-graph/resolve-place-coordinates";

export type PinCoordOverride = {
  lat: number;
  lng: number;
};

export function applyPinCoordOverrides(
  pins: readonly ClassifiedGlobePin[],
  overrides: ReadonlyMap<string, PinCoordOverride>,
): ClassifiedGlobePin[] {
  if (overrides.size === 0) {
    return [...pins];
  }
  return pins.map((pin) => {
    const override = overrides.get(pin.id);
    if (!override) {
      return pin;
    }
    const map = projectLatLngToMapPercent(override.lat, override.lng);
    return {
      ...pin,
      lat: override.lat,
      lng: override.lng,
      pinX: map.x,
      pinY: map.y,
    };
  });
}
