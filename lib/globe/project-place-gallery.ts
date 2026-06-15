import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { projectVolumeSpatialMedia } from "@/lib/experience-graph/project-volume-spatial-media";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { stockPhotosForPlaceLabel } from "@/lib/globe/place-stock-photos";

export type PlaceGalleryItem = {
  id: string;
  label: string;
  imageUrl: string | null;
  mediaContextId: string | null;
  capturedAtIso: string | null;
  mediaKind?: "photo" | "video";
};

export function projectPlaceGallery(input: {
  event: EventCandidate | null | undefined;
  volume: ExperienceVolume | null | undefined;
  limit?: number;
}): PlaceGalleryItem[] {
  const limit = input.limit ?? 12;
  const items: PlaceGalleryItem[] = [];
  const seen = new Set<string>();

  const push = (item: PlaceGalleryItem) => {
    const key = item.imageUrl ?? item.mediaContextId ?? item.id;
    if (!key || seen.has(key) || items.length >= limit) {
      return;
    }
    seen.add(key);
    items.push(item);
  };

  const captures = readFeedCaptureFragments(input.event)
    .filter((row) => row.kind === "photo" || row.kind === "video")
    .sort(
      (left, right) =>
        Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso),
    );

  for (const row of captures) {
    push({
      id: `capture:${row.id}`,
      label:
        row.label?.trim() ||
        row.placeLabel?.trim() ||
        (row.kind === "video" ? "동영상" : "사진"),
      imageUrl: row.url?.trim() || null,
      mediaContextId: row.mediaContextId?.trim() || null,
      capturedAtIso: row.capturedAtIso,
      mediaKind: row.kind === "video" ? "video" : "photo",
    });
  }

  if (input.volume) {
    for (const row of projectVolumeSpatialMedia(input.volume)) {
      if (row.kind !== "photo" && row.kind !== "video") {
        continue;
      }
      push({
        id: `spatial:${row.id}`,
        label: row.title,
        imageUrl: null,
        mediaContextId: null,
        capturedAtIso: row.capturedAtIso,
        mediaKind: row.kind === "video" ? "video" : "photo",
      });
    }
  }

  const placeLabel =
    input.event?.place?.trim() ||
    input.volume?.space.label?.trim() ||
    input.event?.title?.trim() ||
    "장소";

  for (const [index, url] of stockPhotosForPlaceLabel(placeLabel).entries()) {
    if (items.length >= limit) {
      break;
    }
    if (seen.has(url)) {
      continue;
    }
    push({
      id: `stock:${index}`,
      label: placeLabel,
      imageUrl: url,
      mediaContextId: null,
      capturedAtIso: null,
    });
  }

  return items;
}
