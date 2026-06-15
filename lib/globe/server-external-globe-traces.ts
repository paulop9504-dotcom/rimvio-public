import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";
import { bboxForGlobeTraceQuery } from "@/lib/globe/globe-trace-cell";
import { globeTraceCellKey } from "@/lib/globe/globe-trace-cell";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";

const DEFAULT_RADIUS_M = 900;

type RemotePinRow = {
  id: string;
  user_id: string;
  event_id: string;
  pin: PersonalGlobePin | null;
  visibility: string | null;
  lat: number | null;
  lng: number | null;
  updated_at: string | null;
};

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

function recallLineFromPin(pin: PersonalGlobePin): string | null {
  const line = pin.experienceTitle?.trim() || pin.placeLabel?.trim();
  return line || null;
}

export function mapRemoteRowToExternalTrace(row: RemotePinRow): ExternalGlobeTrace | null {
  const pin = row.pin;
  const lat = row.lat ?? pin?.lat;
  const lng = row.lng ?? pin?.lng;
  if (!pin?.eventId?.trim() || lat == null || lng == null) {
    return null;
  }
  if (row.visibility !== "external") {
    return null;
  }

  return {
    traceId: row.id,
    eventId: pin.eventId,
    title: pin.experienceTitle?.trim() || pin.placeLabel?.trim() || "흔적",
    placeLabel: pin.placeLabel?.trim() || "장소",
    lat,
    lng,
    authorUserId: row.user_id,
    authorDisplayName: null,
    photoCount: pin.photoCount ?? 0,
    videoCount: pin.videoCount ?? 0,
    startedAtIso: pin.createdAtIso ?? row.updated_at,
    recallLine: recallLineFromPin(pin),
    pioneerCell: globeTraceCellKey(lat, lng),
  };
}

export function filterExternalTracesNear(input: {
  rows: readonly RemotePinRow[];
  lat: number;
  lng: number;
  radiusM?: number;
  excludeUserId?: string | null;
}): ExternalGlobeTrace[] {
  const radiusM = input.radiusM ?? DEFAULT_RADIUS_M;
  const bbox = bboxForGlobeTraceQuery({ lat: input.lat, lng: input.lng, radiusM });

  return input.rows
    .map(mapRemoteRowToExternalTrace)
    .filter((row): row is ExternalGlobeTrace => {
      if (!row) {
        return false;
      }
      if (input.excludeUserId && row.authorUserId === input.excludeUserId) {
        return false;
      }
      if (row.lat < bbox.minLat || row.lat > bbox.maxLat) {
        return false;
      }
      if (row.lng < bbox.minLng || row.lng > bbox.maxLng) {
        return false;
      }
      return haversineMeters(input.lat, input.lng, row.lat, row.lng) <= radiusM;
    })
    .sort((left, right) => {
      const leftMs = left.startedAtIso ? Date.parse(left.startedAtIso) : 0;
      const rightMs = right.startedAtIso ? Date.parse(right.startedAtIso) : 0;
      return rightMs - leftMs;
    });
}

export { DEFAULT_RADIUS_M as EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M };
