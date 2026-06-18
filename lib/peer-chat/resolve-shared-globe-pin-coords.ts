import {
  formatCoordsPlaceLabel,
  resolvePlaceLabelNearCoords,
} from "@/lib/location-ping/format-place-label";
import {
  hydrateGpsPingStore,
  readGpsPingMemorySnapshot,
} from "@/lib/location-ping/gps-ping-store";

export type SharedGlobePinCoords = {
  lat: number;
  lng: number;
  placeLabel: string;
};

function coordsFromLatestGpsPing(): SharedGlobePinCoords | null {
  const pings = readGpsPingMemorySnapshot();
  const latest = pings[pings.length - 1];
  if (!latest) {
    return null;
  }
  return {
    lat: latest.lat,
    lng: latest.lng,
    placeLabel: resolvePlaceLabelNearCoords(latest.lat, latest.lng),
  };
}

function readGeolocation(): Promise<SharedGlobePinCoords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("geolocation_unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        resolve({
          lat,
          lng,
          placeLabel: resolvePlaceLabelNearCoords(lat, lng),
        });
      },
      () => reject(new Error("geolocation_denied")),
      {
        enableHighAccuracy: false,
        maximumAge: 120_000,
        timeout: 12_000,
      },
    );
  });
}

/** Prefer recent GPS ring buffer; fall back to one-shot geolocation. */
export async function resolveSharedGlobePinCoords(): Promise<SharedGlobePinCoords> {
  await hydrateGpsPingStore();
  const fromPing = coordsFromLatestGpsPing();
  if (fromPing) {
    return fromPing;
  }

  try {
    return await readGeolocation();
  } catch {
    throw new Error("위치를 확인할 수 없어요. Rimvio를 켠 뒤 다시 시도해 주세요.");
  }
}

export function formatSharedGlobePinLabel(lat: number, lng: number): string {
  const near = resolvePlaceLabelNearCoords(lat, lng);
  if (near && !near.includes("°")) {
    return near;
  }
  return formatCoordsPlaceLabel(lat, lng);
}
