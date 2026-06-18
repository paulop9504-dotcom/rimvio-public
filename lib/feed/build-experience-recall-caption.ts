import { formatPeerRangLabel } from "@/lib/copy/korean-peer-with";
import { SEASON_LABEL } from "@/lib/experience-graph/derive-media-environment";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";

/** Human one-liner — "2026년 여름에 민수랑 제주" (FACT lineage only). */
export function buildExperienceRecallCaption(input: {
  item?: SpatialMediaItem | null;
  volume?: ExperienceVolume | null;
  pin?: ClassifiedGlobePin | null;
}): string {
  const item = input.item;
  const volume = input.volume;
  const pin = input.pin;

  const iso = item?.capturedAtIso ?? pin?.capturedAtIso ?? volume?.time.startIso;
  const date = iso ? new Date(iso) : null;
  const year =
    date && !Number.isNaN(date.getTime()) ? `${date.getFullYear()}년` : null;
  const season = item ? SEASON_LABEL[item.season] : null;

  const peer = volume?.peerDisplayName?.trim();
  const peerLabel = peer ? formatPeerRangLabel(peer) : null;
  const place =
    item?.placeLabel?.trim() ??
    volume?.space.label?.trim() ??
    pin?.label?.trim() ??
    null;

  const parts: string[] = [];
  if (year) {
    parts.push(year);
  }
  if (season) {
    parts.push(season);
  }

  const timePlace =
    peerLabel && place
      ? `${peerLabel} ${place.replace(/\s*여행$/u, "").trim()}`
      : peerLabel
        ? `${peerLabel}`
        : place
          ? place.replace(/\s*여행$/u, "").trim()
          : null;

  if (parts.length > 0 && timePlace) {
    return `${parts.join(" ")}에 ${timePlace}`;
  }
  if (parts.length > 0) {
    return parts.join(" ");
  }
  if (timePlace) {
    return timePlace;
  }
  if (item?.title) {
    return item.title;
  }
  return pin?.label ?? "그때 거기";
}
