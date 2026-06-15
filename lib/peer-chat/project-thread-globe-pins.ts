import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { projectLatLngToMapPercent } from "@/lib/experience-graph/resolve-place-coordinates";
import {
  isPeerGlobePinPayload,
  type SharedGlobePin,
} from "@/lib/peer-chat/globe-pin-types";
import type { PeerMessageRow } from "@/lib/peer-chat/types";

export function sharedGlobePinFromMessageRow(
  row: PeerMessageRow,
): SharedGlobePin | null {
  if (row.message_type !== "system" || !isPeerGlobePinPayload(row.ai_payload)) {
    return null;
  }

  return {
    messageId: row.id,
    peerThreadId: row.thread_id,
    senderUserId: row.sender_user_id,
    sentAt: row.created_at,
    payload: row.ai_payload,
  };
}

export function listSharedGlobePinsFromMessages(
  rows: readonly PeerMessageRow[],
): SharedGlobePin[] {
  const pins: SharedGlobePin[] = [];
  for (const row of rows) {
    const pin = sharedGlobePinFromMessageRow(row);
    if (pin) {
      pins.push(pin);
    }
  }
  return pins.sort(
    (left, right) =>
      new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime(),
  );
}

export function sharedGlobePinToClassifiedPin(
  pin: SharedGlobePin,
): ClassifiedGlobePin {
  const map = projectLatLngToMapPercent(pin.payload.lat, pin.payload.lng);
  const hasPhoto =
    Boolean(pin.payload.imageUrl?.trim()) || pin.payload.mediaKind === "photo";

  return {
    id: pin.payload.pinId,
    kind: hasPhoto ? "photo" : "place",
    label: pin.payload.placeLabel,
    lat: pin.payload.lat,
    lng: pin.payload.lng,
    pinX: map.x,
    pinY: map.y,
    capturedAtIso: pin.payload.capturedAtIso,
    sourceEventId: null,
    emphasis: "primary",
    authorUserId: pin.senderUserId,
    authorDisplayName: pin.payload.senderDisplayName,
    peerThreadId: pin.peerThreadId,
  };
}

export function projectSharedGlobeClassifiedPins(
  pins: readonly SharedGlobePin[],
): ClassifiedGlobePin[] {
  return pins.map(sharedGlobePinToClassifiedPin);
}
