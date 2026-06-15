/**
 * Query pin projection index by viewport (bbox / radius).
 */

import { bboxForGlobeTraceQuery } from "@/lib/globe/globe-trace-cell";
import type {
  PinProjectionBbox,
  PinProjectionIndexRecord,
  PinProjectionIndexSlice,
} from "@/lib/globe/pin-projection-index-types";
import {
  matchesGlobeContextPeopleFilter,
  type GlobeContextPeopleFilter,
} from "@/lib/globe/globe-context-people-filter";
import {
  matchesGlobeContextTimeFilter,
  type GlobeContextTimeFilter,
} from "@/lib/globe/globe-context-time-filter";
import type { EventCandidate } from "@/lib/events/event-candidate";

export function pinProjectionRecordInBbox(
  record: PinProjectionIndexRecord,
  bbox: PinProjectionBbox,
): boolean {
  return (
    record.lat >= bbox.minLat &&
    record.lat <= bbox.maxLat &&
    record.lng >= bbox.minLng &&
    record.lng <= bbox.maxLng
  );
}

export function queryPinProjectionIndex(input: {
  records: readonly PinProjectionIndexRecord[];
  bbox?: PinProjectionBbox | null;
  timeFilter?: GlobeContextTimeFilter;
  peopleFilter?: GlobeContextPeopleFilter;
  eventsById?: ReadonlyMap<string, EventCandidate>;
  limit?: number;
}): PinProjectionIndexSlice {
  const timeFilter = input.timeFilter ?? "all";
  const peopleFilter = input.peopleFilter ?? null;
  const eventsById = input.eventsById ?? new Map<string, EventCandidate>();

  let rows = input.records.filter(
    (record) =>
      matchesGlobeContextTimeFilter(record.startedAtIso, timeFilter) &&
      matchesGlobeContextPeopleFilter(record.eventId, peopleFilter, eventsById),
  );

  if (input.bbox) {
    rows = rows.filter((record) => pinProjectionRecordInBbox(record, input.bbox!));
  }

  const total = rows.length;
  const limit = input.limit ?? total;
  return {
    records: rows.slice(0, limit),
    bbox: input.bbox ?? null,
    total,
  };
}

export function parseGlobePinsBboxParam(raw: string | null | undefined): PinProjectionBbox | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return null;
  }
  const [minLat, minLng, maxLat, maxLng] = parts as [
    number,
    number,
    number,
    number,
  ];
  return {
    minLat: Math.min(minLat, maxLat),
    maxLat: Math.max(minLat, maxLat),
    minLng: Math.min(minLng, maxLng),
    maxLng: Math.max(minLng, maxLng),
  };
}

export function bboxFromGlobePinsNear(input: {
  lat: number;
  lng: number;
  radiusM: number;
}): PinProjectionBbox {
  return bboxForGlobeTraceQuery(input);
}

export type ParsedGlobePinsQuery =
  | { mode: "all" }
  | { mode: "bbox"; bbox: PinProjectionBbox }
  | { mode: "near"; lat: number; lng: number; radiusM: number; bbox: PinProjectionBbox };

export function parseGlobePinsQuery(params: {
  bbox?: string | null;
  lat?: string | null;
  lng?: string | null;
  radiusM?: string | null;
}): ParsedGlobePinsQuery {
  const bbox = parseGlobePinsBboxParam(params.bbox ?? null);
  if (bbox) {
    return { mode: "bbox", bbox };
  }

  const lat = params.lat ? Number.parseFloat(params.lat) : NaN;
  const lng = params.lng ? Number.parseFloat(params.lng) : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const radiusRaw = params.radiusM ? Number.parseFloat(params.radiusM) : NaN;
    const radiusM = Number.isFinite(radiusRaw) ? radiusRaw : 25_000;
    return {
      mode: "near",
      lat,
      lng,
      radiusM,
      bbox: bboxFromGlobePinsNear({ lat, lng, radiusM }),
    };
  }

  return { mode: "all" };
}
