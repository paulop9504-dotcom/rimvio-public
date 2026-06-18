import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { projectVolumeSpatialMedia } from "@/lib/experience-graph/project-volume-spatial-media";
import { projectLatLngToMapPercent } from "@/lib/experience-graph/resolve-place-coordinates";
import type {
  ClassifiedGlobePin,
  ExperienceGlobePingKind,
} from "@/lib/feed/experience-globe-ping-types";
import { projectDwellMinutesFromGpsPings } from "@/lib/feed/project-dwell-from-gps-pings";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type { GpsPing } from "@/lib/location-ping/types";
import type { SpatialMediaKind } from "@/lib/experience-graph/spatial-media-types";

const MAX_GPS_PINS = 10;

function mediaKindToPinKind(kind: SpatialMediaKind): ExperienceGlobePingKind {
  if (kind === "video") {
    return "video";
  }
  if (kind === "photo") {
    return "photo";
  }
  return "place";
}

function pinFromLatLng(input: {
  id: string;
  kind: ExperienceGlobePingKind;
  label: string;
  lat: number;
  lng: number;
  capturedAtIso?: string | null;
  sourceEventId?: string | null;
  emphasis?: ClassifiedGlobePin["emphasis"];
}): ClassifiedGlobePin {
  const pin = projectLatLngToMapPercent(input.lat, input.lng);
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    lat: input.lat,
    lng: input.lng,
    pinX: pin.x,
    pinY: pin.y,
    capturedAtIso: input.capturedAtIso ?? null,
    sourceEventId: input.sourceEventId ?? null,
    emphasis: input.emphasis ?? "primary",
  };
}

function gpsPingsForEvent(
  event: EventCandidate,
  pings: readonly GpsPing[],
): GpsPing[] {
  const plan = readPlanContextFromEvent(event);
  const startMs = parseIsoMs(event.datetime ?? event.createdAt);
  if (startMs === null) {
    return [];
  }
  const endMs =
    parseIsoMs(plan?.windowEndIso ?? event.updatedAt) ??
    startMs + 24 * 60 * 60 * 1000;

  return pings
    .filter((ping) => {
      const ms = parseIsoMs(ping.capturedAtIso);
      return ms !== null && ms >= startMs - 60 * 60 * 1000 && ms <= endMs + 60 * 60 * 1000;
    })
    .sort(
      (left, right) =>
        (parseIsoMs(left.capturedAtIso) ?? 0) - (parseIsoMs(right.capturedAtIso) ?? 0),
    );
}

/** Pure read — spatial media + GPS pings for one experience volume. */
export function projectExperienceClassifiedGlobePings(input: {
  volume: ExperienceVolume | null | undefined;
  event: EventCandidate | null | undefined;
  gpsPings?: readonly GpsPing[];
  emphasis?: ClassifiedGlobePin["emphasis"];
}): ClassifiedGlobePin[] {
  const pins: ClassifiedGlobePin[] = [];
  const emphasis = input.emphasis ?? "primary";
  const eventId = input.event?.id ?? input.volume?.sourceEventId ?? null;

  if (input.volume) {
    for (const item of projectVolumeSpatialMedia(input.volume)) {
      pins.push(
        pinFromLatLng({
          id: item.id,
          kind: mediaKindToPinKind(item.kind),
          label: item.title,
          lat: item.lat,
          lng: item.lng,
          capturedAtIso: item.capturedAtIso,
          sourceEventId: eventId,
          emphasis,
        }),
      );
    }
  }

  if (input.event && (input.gpsPings?.length ?? 0) > 0) {
    const matched = gpsPingsForEvent(input.event, input.gpsPings ?? []);
    const step = Math.max(1, Math.floor(matched.length / MAX_GPS_PINS));
    for (let i = 0; i < matched.length; i += step) {
      const ping = matched[i]!;
      pins.push(
        pinFromLatLng({
          id: `gps:${eventId}:${ping.id}`,
          kind: "gps",
          label: "GPS",
          lat: ping.lat,
          lng: ping.lng,
          capturedAtIso: ping.capturedAtIso,
          sourceEventId: eventId,
          emphasis,
        }),
      );
      if (pins.filter((row) => row.kind === "gps").length >= MAX_GPS_PINS) {
        break;
      }
    }

    const plan = readPlanContextFromEvent(input.event);
    const dwellMinutes = projectDwellMinutesFromGpsPings({
      pings: input.gpsPings ?? [],
      windowStartIso: input.event.datetime ?? input.event.createdAt,
      windowEndIso: plan?.windowEndIso ?? null,
      placeLabel: plan?.place ?? input.event.place ?? input.volume?.space.label ?? null,
    });
    if (dwellMinutes !== null && matched.length > 0) {
      const mid = matched[Math.floor(matched.length / 2)]!;
      pins.push(
        pinFromLatLng({
          id: `dwell:${eventId}`,
          kind: "dwell",
          label: `체류 ${dwellMinutes}분`,
          lat: mid.lat,
          lng: mid.lng,
          capturedAtIso: mid.capturedAtIso,
          sourceEventId: eventId,
          emphasis,
        }),
      );
    }
  }

  return pins;
}

/** Merge primary + related-axis volumes — primary pins stay bright. */
export function mergeClassifiedGlobePins(
  primary: readonly ClassifiedGlobePin[],
  related: readonly ClassifiedGlobePin[],
): ClassifiedGlobePin[] {
  const seen = new Set<string>();
  const merged: ClassifiedGlobePin[] = [];
  for (const pin of primary) {
    if (seen.has(pin.id)) {
      continue;
    }
    seen.add(pin.id);
    merged.push(pin);
  }
  for (const pin of related) {
    if (seen.has(pin.id)) {
      continue;
    }
    seen.add(pin.id);
    merged.push({ ...pin, emphasis: "related" });
  }
  return merged;
}
