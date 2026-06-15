"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { isGlobeContextRemoved } from "@/lib/globe/delete-globe-context";
import {
  readGlobeContextCardCoords,
  resolveGlobeContextPlaceLabel,
  syncGlobeContextCardCoords,
} from "@/lib/globe/globe-context-card-coords";
import {
  findPersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { resolveGlobeContextPinCluster } from "@/lib/globe/resolve-globe-context-pin-cluster";
import type { ManualContextResolvedPlace } from "@/lib/globe/resolve-manual-context-place-candidates";
import {
  resolveGlobeStartupView,
  type GlobeStartupView,
} from "@/lib/globe/resolve-globe-startup-view";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";

const MIN_COORD_SHIFT_M = 80;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shouldAlignGlobeContext(event: EventCandidate): boolean {
  if (isGlobeContextRemoved(event)) {
    return false;
  }
  const meta = event.metadata ?? {};
  if (meta.globeManualContext === true || meta.targetingSource === "globe_manual") {
    return true;
  }
  if (findPersonalGlobePinByEventId(event.id)) {
    return true;
  }
  return Boolean(event.place?.trim());
}

export async function fetchGlobeContextPlaceGeocode(input: {
  place: string;
  title?: string | null;
  userLat?: number | null;
  userLng?: number | null;
}): Promise<ManualContextResolvedPlace | null> {
  const place = input.place.trim();
  if (!place) {
    return null;
  }

  const params = new URLSearchParams({ place });
  if (input.title?.trim()) {
    params.set("title", input.title.trim());
  }
  if (
    typeof input.userLat === "number" &&
    typeof input.userLng === "number" &&
    Number.isFinite(input.userLat) &&
    Number.isFinite(input.userLng)
  ) {
    params.set("lat", String(input.userLat));
    params.set("lng", String(input.userLng));
  }

  try {
    const response = await fetch(`/api/globe/place-candidates?${params.toString()}`);
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      autoResolved?: ManualContextResolvedPlace | null;
    };
    return json.autoResolved ?? null;
  } catch {
    return null;
  }
}

function applyResolvedPlace(
  event: EventCandidate,
  resolved: ManualContextResolvedPlace,
): boolean {
  const current = readGlobeContextCardCoords(event);
  const label = resolved.label.trim() || resolved.placeName.trim();
  const shifted = haversineMeters(
    current.lat,
    current.lng,
    resolved.lat,
    resolved.lng,
  );
  if (shifted < MIN_COORD_SHIFT_M && current.placeLabel.trim() === label) {
    return false;
  }

  syncGlobeContextCardCoords(event, label, {
    lat: resolved.lat,
    lng: resolved.lng,
    label,
  });

  const pin = findPersonalGlobePinByEventId(event.id);
  if (pin) {
    upsertPersonalGlobePin({
      ...pin,
      lat: resolved.lat,
      lng: resolved.lng,
      placeLabel: label,
    });
  }

  return true;
}

export type AlignGlobeContextPlacesResult = {
  updated: number;
  startupView: GlobeStartupView | null;
};

/** Re-geocode card place labels (Kakao/Google) and refresh globe pin coords. */
export async function alignGlobeContextPlaces(input?: {
  userLat?: number | null;
  userLng?: number | null;
}): Promise<AlignGlobeContextPlacesResult> {
  const targets = listLifeEventCandidates().filter(shouldAlignGlobeContext);
  let updated = 0;

  for (const event of targets) {
    const placeLabel = resolveGlobeContextPlaceLabel(event);
    if (!placeLabel.trim()) {
      continue;
    }

    const resolved = await fetchGlobeContextPlaceGeocode({
      place: placeLabel,
      title: event.title,
      userLat: input?.userLat,
      userLng: input?.userLng,
    });
    if (!resolved?.confirmed) {
      continue;
    }
    if (applyResolvedPlace(event, resolved)) {
      updated += 1;
    }
  }

  if (updated > 0) {
    window.dispatchEvent(new CustomEvent(EVENT_CANDIDATES_UPDATED));
  }

  const clusters = targets
    .map((event) => resolveGlobeContextPinCluster(event.id))
    .filter((row): row is PinCluster => row !== null);

  return {
    updated,
    startupView: resolveGlobeStartupView(clusters),
  };
}
