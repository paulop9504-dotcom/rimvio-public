import type { SharedGlobeFoundationPin } from "@/lib/shared-globe/shared-globe-types";
import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";

export function mapLegacyPinToFoundationPin(
  pin: SharedGlobePin,
): SharedGlobeFoundationPin {
  return {
    id: pin.payload.pinId,
    author: {
      userId: pin.senderUserId,
      displayName: pin.payload.senderDisplayName,
    },
    lat: pin.payload.lat,
    lng: pin.payload.lng,
    captureRef: pin.payload.imageUrl ? pin.payload.pinId : null,
    timestamp: pin.payload.capturedAtIso || pin.sentAt,
    placeLabel: pin.payload.placeLabel,
    messageId: pin.messageId,
    imageUrl: pin.payload.imageUrl ?? null,
  };
}
