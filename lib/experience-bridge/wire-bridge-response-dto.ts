import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  FEED_CAPTURES_META_KEY,
  type FeedCaptureFragment,
} from "@/lib/feed/feed-capture-types";
import type {
  ExperienceBridgeContribution,
  ExperienceBridgeParticipant,
  ExperienceBridgeSnapshot,
  ExperienceBridgeState,
  ExperienceBridgeTimelineItem,
} from "@/lib/experience-bridge/experience-bridge-types";

const PUBLIC_CAPTURE_KEYS = new Set([
  "id",
  "kind",
  "capturedAtIso",
  "mediaContextId",
  "placeLabel",
  "label",
  "url",
  "ownerUserId",
  "authorDisplayName",
  "authorAvatarUrl",
]);

/** Strip orchestrator / ingest internals from event metadata before wire egress. */
export function toPublicBridgeEventSnapshot(
  event: EventCandidate,
): EventCandidate {
  const captures = readPublicCaptures(event);
  const meta = event.metadata ?? {};
  const publicMeta: Record<string, unknown> = {};

  if (captures.length > 0) {
    publicMeta[FEED_CAPTURES_META_KEY] = captures;
  }

  for (const key of [
    "globePlaceLat",
    "globePlaceLng",
    "globePlaceLabel",
    "globePlaceCardLabel",
    "globePlaceCardLat",
    "globePlaceCardLng",
    "globePlaceConfirmed",
    "experienceBridgeHost",
    "experienceBridgeParticipant",
  ] as const) {
    if (meta[key] !== undefined) {
      publicMeta[key] = meta[key];
    }
  }

  return {
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: publicMeta,
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function readPublicCaptures(event: EventCandidate): FeedCaptureFragment[] {
  const raw = event.metadata?.[FEED_CAPTURES_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((row): row is FeedCaptureFragment => row && typeof row === "object")
    .map((row) => {
      const out: Record<string, unknown> = {};
      for (const key of PUBLIC_CAPTURE_KEYS) {
        const value = row[key as keyof FeedCaptureFragment];
        if (value !== undefined && value !== null && value !== "") {
          out[key] = value;
        }
      }
      return out as FeedCaptureFragment;
    });
}

export function toBridgeParticipantWire(
  row: ExperienceBridgeParticipant,
): ExperienceBridgeParticipant {
  return {
    userId: row.userId,
    displayName: row.displayName,
    status: row.status,
    role: row.role,
    invitedAtIso: row.invitedAtIso,
    joinedAtIso: row.joinedAtIso ?? null,
    leftAtIso: row.leftAtIso ?? null,
  };
}

export function toBridgeSnapshotWire(
  bridge: ExperienceBridgeSnapshot,
): ExperienceBridgeSnapshot {
  return {
    eventId: bridge.eventId,
    hostUserId: bridge.hostUserId,
    peerThreadId: bridge.peerThreadId,
    title: bridge.title,
    placeLabel: bridge.placeLabel,
    lat: bridge.lat,
    lng: bridge.lng,
    eventSnapshot: toPublicBridgeEventSnapshot(bridge.eventSnapshot),
    createdAtIso: bridge.createdAtIso,
  };
}

export function toBridgeStateWire(state: ExperienceBridgeState): ExperienceBridgeState {
  return {
    bridge: toBridgeSnapshotWire(state.bridge),
    participants: state.participants.map(toBridgeParticipantWire),
  };
}

export function toBridgeTimelineWire(
  items: readonly ExperienceBridgeTimelineItem[],
): ExperienceBridgeTimelineItem[] {
  return items.map((row) => ({
    id: row.id,
    kind: row.kind,
    capturedAtIso: row.capturedAtIso,
    ownerUserId: row.ownerUserId,
    authorDisplayName: row.authorDisplayName,
    placeLabel: row.placeLabel,
    imageUrl: row.imageUrl ?? null,
    viewOnly: row.viewOnly,
  }));
}

export function toBridgeContributionWire(
  row: ExperienceBridgeContribution,
): ExperienceBridgeContribution {
  const capture = row.capture;
  return {
    contributorUserId: row.contributorUserId,
    createdAtIso: row.createdAtIso,
    capture: {
      id: capture.id,
      kind: capture.kind,
      capturedAtIso: capture.capturedAtIso,
      mediaContextId: capture.mediaContextId,
      placeLabel: capture.placeLabel,
      label: capture.label,
      url: capture.url,
      ownerUserId: capture.ownerUserId ?? row.contributorUserId,
      authorDisplayName: capture.authorDisplayName,
      authorAvatarUrl: capture.authorAvatarUrl,
    },
  };
}
