/** Shared empty globe — collaborative pins synced via peer ROOM + server. */

export const PEER_GLOBE_PIN_PAYLOAD_KIND = "globe_pin" as const;

export type PeerGlobePinMediaKind = "photo" | "video";

export type PeerGlobePinPayload = {
  kind: typeof PEER_GLOBE_PIN_PAYLOAD_KIND;
  pinId: string;
  lat: number;
  lng: number;
  placeLabel: string;
  senderDisplayName: string;
  capturedAtIso: string;
  note?: string | null;
  imageUrl?: string | null;
  mediaKind?: PeerGlobePinMediaKind | null;
};

export type SharedGlobePin = {
  messageId: string;
  peerThreadId: string;
  senderUserId: string;
  sentAt: string;
  payload: PeerGlobePinPayload;
};

export function isPeerGlobePinPayload(
  value: unknown,
): value is PeerGlobePinPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<PeerGlobePinPayload>;
  return (
    row.kind === PEER_GLOBE_PIN_PAYLOAD_KIND &&
    typeof row.pinId === "string" &&
    typeof row.lat === "number" &&
    Number.isFinite(row.lat) &&
    typeof row.lng === "number" &&
    Number.isFinite(row.lng) &&
    typeof row.placeLabel === "string" &&
    typeof row.senderDisplayName === "string" &&
    typeof row.capturedAtIso === "string"
  );
}

export function buildGlobePinSystemBody(input: {
  senderDisplayName: string;
  placeLabel: string;
  hasPhoto?: boolean;
}): string {
  const who = input.senderDisplayName.trim() || "친구";
  const where = input.placeLabel.trim() || "이곳";
  if (input.hasPhoto) {
    return `📍 ${who}님이 ${where}에 사진 핀을 박았어요`;
  }
  return `📍 ${who}님이 ${where}에 핀을 박았어요`;
}
