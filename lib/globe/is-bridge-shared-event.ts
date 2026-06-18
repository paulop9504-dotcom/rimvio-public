import type { EventCandidate } from "@/lib/events/event-candidate";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";

export function isBridgeSharedEvent(event: EventCandidate | null | undefined): boolean {
  if (!event?.metadata) {
    return false;
  }
  const meta = event.metadata;
  return (
    meta.experienceBridgeParticipant === true ||
    meta.experienceBridgeHost === true ||
    typeof meta[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === "string"
  );
}
