import { mapLegacyPinToFoundationPin } from "@/lib/shared-globe/map-legacy-globe-pin";
import type {
  SharedGlobe,
  SharedGlobeFoundationPin,
} from "@/lib/shared-globe/shared-globe-types";
import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";

export type PlaceSharedGlobePinInput = {
  lat: number;
  lng: number;
  placeLabel: string;
  author: {
    userId: string;
    displayName: string;
  };
  captureRef?: string | null;
  timestamp?: string;
  imageUrl?: string | null;
};

export function buildSharedGlobeFoundationPin(
  input: PlaceSharedGlobePinInput,
): SharedGlobeFoundationPin {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const pinId = crypto.randomUUID();

  return {
    id: pinId,
    author: input.author,
    lat: input.lat,
    lng: input.lng,
    captureRef: input.captureRef ?? (input.imageUrl ? pinId : null),
    timestamp,
    placeLabel: input.placeLabel.trim() || "이곳",
    imageUrl: input.imageUrl ?? null,
  };
}

/** Merge placed pin into globe projection (client optimistic). */
export function applySharedGlobePin(
  globe: SharedGlobe,
  pin: SharedGlobeFoundationPin,
): SharedGlobe {
  const exists = globe.pins.some((row) => row.id === pin.id);
  if (exists) {
    return globe;
  }
  return {
    ...globe,
    pins: [...globe.pins, pin],
    isEmpty: false,
  };
}

export function applyLegacySharedGlobePin(
  globe: SharedGlobe,
  legacyPin: SharedGlobePin,
): SharedGlobe {
  return applySharedGlobePin(globe, mapLegacyPinToFoundationPin(legacyPin));
}
