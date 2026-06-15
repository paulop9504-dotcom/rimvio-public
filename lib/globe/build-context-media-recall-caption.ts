import { formatPeerRangLabel } from "@/lib/copy/korean-peer-with";
import { isActiveBridgeParticipant } from "@/lib/experience-bridge/bridge-access";
import { readLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import {
  SEASON_LABEL,
  resolveSeason,
} from "@/lib/experience-graph/derive-media-environment";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";

function relativeYearLabel(date: Date, now: Date): string | null {
  const year = date.getFullYear();
  const nowYear = now.getFullYear();
  const diff = nowYear - year;
  if (diff === 0) {
    return "올해";
  }
  if (diff === 1) {
    return "작년";
  }
  if (diff === 2) {
    return "재작년";
  }
  return `${year}년`;
}

function stripTripSuffix(label: string): string {
  return label.replace(/\s*여행$/u, "").trim();
}

function formatCompanionLabel(names: readonly string[]): string | null {
  const unique = [...new Set(names.map((row) => row.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return null;
  }
  if (unique.length === 1) {
    return formatPeerRangLabel(unique[0]!);
  }
  if (unique.length === 2) {
    return `${formatPeerRangLabel(unique[0]!)} ${formatPeerRangLabel(unique[1]!)}`;
  }
  return "친구들이랑";
}

function readBridgeCompanionNames(input: {
  eventId: string;
  viewerUserId?: string | null;
}): string[] {
  const state = readLocalBridgeState(input.eventId.trim());
  if (!state) {
    return [];
  }
  const viewer = input.viewerUserId?.trim();
  return state.participants
    .filter(isActiveBridgeParticipant)
    .map((row) => ({
      userId: row.userId.trim(),
      displayName: row.displayName.trim(),
    }))
    .filter((row) => row.displayName && (!viewer || row.userId !== viewer))
    .map((row) => row.displayName);
}

function resolveCompanionNames(input: {
  event?: EventCandidate | null;
  volume?: ExperienceVolume | null;
  item: Pick<
    ContextMediaReelItem,
    "authorDisplayName" | "ownerUserId" | "placeLabel"
  >;
  viewerUserId?: string | null;
}): string[] {
  const names: string[] = [];
  const eventId = input.event?.id?.trim() ?? "";

  const peer = input.volume?.peerDisplayName?.trim();
  if (peer) {
    names.push(peer);
  }

  if (eventId) {
    names.push(
      ...readBridgeCompanionNames({
        eventId,
        viewerUserId: input.viewerUserId,
      }),
    );
  }

  const author = input.item.authorDisplayName?.trim();
  const viewer = input.viewerUserId?.trim();
  const owner = input.item.ownerUserId?.trim();
  if (
    author &&
    (!viewer || author !== viewer) &&
    (!owner || author !== owner)
  ) {
    names.push(author);
  }

  return names;
}

function resolvePlaceLabel(input: {
  event?: EventCandidate | null;
  volume?: ExperienceVolume | null;
  item: Pick<ContextMediaReelItem, "placeLabel">;
}): string | null {
  const fromItem = input.item.placeLabel?.trim();
  if (fromItem && fromItem !== "사진" && fromItem !== "동영상") {
    return stripTripSuffix(fromItem);
  }
  const fromEvent = input.event?.place?.trim();
  if (fromEvent) {
    return stripTripSuffix(fromEvent);
  }
  const fromVolume = input.volume?.space.label?.trim();
  if (fromVolume) {
    return stripTripSuffix(fromVolume);
  }
  return null;
}

/** Globe map / pin reel — "작년 여름 · 민수랑 제주" (FACT only). */
export function buildGlobeContextMediaRecallCaption(input: {
  event?: EventCandidate | null;
  volume?: ExperienceVolume | null;
  item: Pick<
    ContextMediaReelItem,
    "capturedAtIso" | "authorDisplayName" | "ownerUserId" | "placeLabel"
  >;
  viewerUserId?: string | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const iso =
    input.item.capturedAtIso?.trim() ||
    input.event?.datetime?.trim() ||
    input.volume?.time.startIso?.trim() ||
    null;

  const timeParts: string[] = [];
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      const yearLabel = relativeYearLabel(date, now);
      const season = SEASON_LABEL[resolveSeason(date)];
      if (yearLabel) {
        timeParts.push(yearLabel);
      }
      timeParts.push(season);
    }
  }

  const companions = resolveCompanionNames(input);
  const companionLabel = formatCompanionLabel(companions);
  const place = resolvePlaceLabel(input);

  const whoPlace =
    companionLabel && place
      ? `${companionLabel} ${place}`
      : companionLabel || place;

  const timeLabel = timeParts.join(" ");
  if (timeLabel && whoPlace) {
    return `${timeLabel} · ${whoPlace}`;
  }
  if (timeLabel) {
    return timeLabel;
  }
  if (whoPlace) {
    return whoPlace;
  }
  const title = input.event?.title?.trim();
  if (title) {
    return title;
  }
  return "그때 거기";
}
