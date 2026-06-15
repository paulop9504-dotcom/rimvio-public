import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";
import type { ExperienceBridgeContribution } from "@/lib/experience-bridge/experience-bridge-types";
import { canEditBridgeMedia } from "@/lib/experience-bridge/bridge-access";
import type {
  ExperienceBridgeSnapshot,
  ExperienceBridgeTimelineItem,
} from "@/lib/experience-bridge/experience-bridge-types";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";

function captureOwnerId(
  capture: { ownerUserId?: string },
  fallbackUserId: string,
): string {
  return capture.ownerUserId?.trim() || fallbackUserId;
}

function captureAuthorName(
  capture: { authorDisplayName?: string; label?: string },
  fallback: string,
): string {
  return capture.authorDisplayName?.trim() || capture.label?.trim() || fallback;
}

/** Shared Experience — merged timeline (host captures + thread shared pins). */
export function mergeBridgeTimeline(input: {
  bridge: ExperienceBridgeSnapshot;
  sharedPins?: readonly SharedGlobePin[];
  contributions?: readonly ExperienceBridgeContribution[];
  participants?: readonly { userId: string; displayName: string }[];
  viewerUserId: string;
  hostDisplayName?: string;
}): ExperienceBridgeTimelineItem[] {
  const hostUserId = input.bridge.hostUserId;
  const hostName = input.hostDisplayName?.trim() || "호스트";
  const event = input.bridge.eventSnapshot;
  const coords = resolveEventGlobeCoords(event);

  const fromCaptures: ExperienceBridgeTimelineItem[] = readFeedCaptureFragments(
    event,
  ).map((capture) => {
    const ownerUserId = captureOwnerId(
      capture as { ownerUserId?: string },
      hostUserId,
    );
    return {
      id: `cap:${capture.id}`,
      kind: capture.kind,
      capturedAtIso: capture.capturedAtIso,
      ownerUserId,
      authorDisplayName: captureAuthorName(
        capture as { authorDisplayName?: string; label?: string },
        hostName,
      ),
      placeLabel: capture.placeLabel ?? coords.placeLabel,
      imageUrl: capture.url ?? null,
      viewOnly: !canEditBridgeMedia({ viewerUserId: input.viewerUserId, ownerUserId }),
    };
  });

  const fromPins: ExperienceBridgeTimelineItem[] = (input.sharedPins ?? []).map(
    (pin) => {
      const ownerUserId = pin.senderUserId;
      return {
        id: `pin:${pin.messageId}`,
        kind:
          pin.payload.mediaKind === "video"
            ? "shared_pin_video"
            : "shared_pin_photo",
        capturedAtIso: pin.payload.capturedAtIso || pin.sentAt,
        ownerUserId,
        authorDisplayName: pin.payload.senderDisplayName,
        placeLabel: pin.payload.placeLabel,
        imageUrl: pin.payload.imageUrl ?? null,
        viewOnly: !canEditBridgeMedia({ viewerUserId: input.viewerUserId, ownerUserId }),
      };
    },
  );

  const participantNameById = new Map(
    (input.participants ?? []).map((row) => [row.userId, row.displayName.trim() || "친구"]),
  );

  const fromContributions: ExperienceBridgeTimelineItem[] = (
    input.contributions ?? []
  ).map((row) => {
    const capture = row.capture;
    const ownerUserId = row.contributorUserId;
    return {
      id: `contrib:${ownerUserId}:${capture.id}`,
      kind: capture.kind === "video" ? "video" : "photo",
      capturedAtIso: capture.capturedAtIso,
      ownerUserId,
      authorDisplayName:
        capture.authorDisplayName?.trim() ||
        participantNameById.get(ownerUserId) ||
        "친구",
      placeLabel: capture.placeLabel ?? coords.placeLabel,
      imageUrl: capture.url ?? null,
      viewOnly: !canEditBridgeMedia({ viewerUserId: input.viewerUserId, ownerUserId }),
    };
  });

  return [...fromCaptures, ...fromPins, ...fromContributions].sort(
    (left, right) =>
      Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso),
  );
}

export function buildBridgeSnapshot(input: {
  event: EventCandidate;
  hostUserId: string;
  peerThreadId?: string | null;
}): ExperienceBridgeSnapshot {
  const coords = resolveEventGlobeCoords(input.event);
  return {
    eventId: input.event.id,
    hostUserId: input.hostUserId,
    peerThreadId: input.peerThreadId?.trim() || null,
    title: input.event.title.trim() || "경험",
    placeLabel: coords.placeLabel,
    lat: coords.lat,
    lng: coords.lng,
    eventSnapshot: input.event,
    createdAtIso: input.event.createdAt || new Date().toISOString(),
  };
}
