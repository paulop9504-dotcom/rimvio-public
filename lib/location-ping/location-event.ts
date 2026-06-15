import type { GpsPing } from "@/lib/location-ping/types";

/** Canonical location FACT — ingest substrate, not a surface owner. */
export type LocationEvent = {
  id: string;
  lat: number;
  lng: number;
  timestamp: string;
  accuracyM: number | null;
  durationMs: number | null;
  source: GpsPing["source"];
};

export function projectLocationEventFromGpsPing(
  ping: GpsPing,
  durationMs: number | null = null,
): LocationEvent {
  return {
    id: ping.id,
    lat: ping.lat,
    lng: ping.lng,
    timestamp: ping.capturedAtIso,
    accuracyM: ping.accuracyM,
    durationMs,
    source: ping.source,
  };
}
