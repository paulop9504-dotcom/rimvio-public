import {
  formatSpatialTimeLabel,
  inferWeatherForMoment,
  resolveSeason,
  resolveTimeOfDay,
} from "@/lib/experience-graph/derive-media-environment";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";
import { projectUploadedSpatialMedia } from "@/lib/location-ping/project-uploaded-spatial-media";

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function offsetIso(baseIso: string, offsetMinutes: number): string {
  const ms = parseMs(baseIso);
  if (ms === null) {
    return baseIso;
  }
  return new Date(ms + offsetMinutes * 60_000).toISOString();
}

function buildItem(input: {
  id: string;
  kind: SpatialMediaItem["kind"];
  title: string;
  caption?: string;
  capturedAtIso: string;
  volume: ExperienceVolume;
  coords: ReturnType<typeof resolvePlaceCoordinates>;
  peakId?: string;
  durationSec?: number;
}): SpatialMediaItem {
  const date = new Date(input.capturedAtIso);
  const timeOfDay = resolveTimeOfDay(date);
  const season = resolveSeason(date);
  const weather = inferWeatherForMoment({
    season,
    timeOfDay,
    placeLabel: input.volume.space.label,
  });

  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    caption: input.caption ?? null,
    capturedAtIso: input.capturedAtIso,
    placeLabel: input.coords.label,
    clusterId: input.volume.space.clusterId,
    lat: input.coords.lat,
    lng: input.coords.lng,
    timeOfDay,
    season,
    weatherCondition: weather.condition,
    weatherLabel: weather.label,
    temperatureC: weather.temperatureC,
    peakId: input.peakId ?? null,
    durationSec: input.durationSec ?? null,
  };
}

/**
 * Layer 2 read — project a volume into browsable spatial media items.
 * Demo placeholders until raw photo/video spine attaches to SSOT.
 */
export function projectVolumeSpatialMedia(volume: ExperienceVolume): SpatialMediaItem[] {
  const coords = resolvePlaceCoordinates(volume.space.label);
  const startIso = volume.time.startIso;
  const items: SpatialMediaItem[] = [];

  items.push(
    buildItem({
      id: `${volume.id}:media:photo:arrival`,
      kind: "photo",
      title: "도착",
      caption: `${coords.label}에 닿은 순간`,
      capturedAtIso: startIso,
      volume,
      coords,
    }),
  );

  for (const [index, peak] of volume.peaks.entries()) {
    const peakIso = peak.timeAt ?? offsetIso(startIso, 90 * (index + 1));
    items.push(
      buildItem({
        id: `${volume.id}:media:photo:${peak.id}`,
        kind: "photo",
        title: peak.label,
        caption: peak.queryHint,
        capturedAtIso: peakIso,
        volume,
        coords,
        peakId: peak.id,
      }),
    );
    items.push(
      buildItem({
        id: `${volume.id}:media:video:${peak.id}`,
        kind: "video",
        title: `${peak.kind === "moment" ? "순간" : "체류"} clip`,
        caption: formatSpatialTimeLabel(peakIso) ?? undefined,
        capturedAtIso: peakIso,
        volume,
        coords,
        peakId: peak.id,
        durationSec: peak.kind === "moment" ? 12 : 24,
      }),
    );
    items.push(
      buildItem({
        id: `${volume.id}:media:text:${peak.id}`,
        kind: "text",
        title: peak.queryHint,
        caption: volume.peerDisplayName
          ? `${volume.peerDisplayName}와 함께`
          : undefined,
        capturedAtIso: peakIso,
        volume,
        coords,
        peakId: peak.id,
      }),
    );
  }

  if (volume.time.endIso) {
    items.push(
      buildItem({
        id: `${volume.id}:media:other:departure`,
        kind: "other",
        title: "떠나는 길",
        caption: `${coords.label} · 이동 맥락`,
        capturedAtIso: volume.time.endIso,
        volume,
        coords,
      }),
    );
  }

  const uploaded = projectUploadedSpatialMedia(
    readMediaContextMemorySnapshot(),
    volume,
  );

  return [...uploaded, ...items].sort(
    (a, b) => parseMs(a.capturedAtIso)! - parseMs(b.capturedAtIso)!,
  );
}
