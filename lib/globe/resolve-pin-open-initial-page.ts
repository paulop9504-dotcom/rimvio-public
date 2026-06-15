import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { isBridgeSharedEvent } from "@/lib/globe/is-bridge-shared-event";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { resolveExperienceVolumeForEvent } from "@/lib/globe/resolve-globe-context-primary-video";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type PinOpenInitialPage = "media" | "context";

/** Map bubble tap — bridge contexts open on 맥락 tab. */
export function resolvePinOpenInitialPage(input: {
  eventId: string;
  viewerUserId?: string | null;
  fromMapMediaTap?: boolean;
}): PinOpenInitialPage {
  if (!input.fromMapMediaTap) {
    return "media";
  }

  const eventId = input.eventId.trim();
  if (!eventId) {
    return "media";
  }

  if (isBridgeLinkedEventId(eventId)) {
    return "context";
  }

  const event =
    findLifeEventCandidate(eventId) ?? recoverGlobeContextEventFromPin(eventId);
  if (isBridgeSharedEvent(event)) {
    return "context";
  }

  const viewerId = input.viewerUserId?.trim();
  if (event && viewerId) {
    const volume = resolveExperienceVolumeForEvent(eventId);
    const reel = projectContextMediaReel({
      event,
      volume,
      viewerUserId: viewerId,
    });
    if (
      reel.some(
        (row) =>
          row.ownerUserId?.trim() &&
          row.ownerUserId.trim() !== viewerId,
      )
    ) {
      return "context";
    }
  }

  return "media";
}
