import type { EventCandidate } from "@/lib/events/event-candidate";
import { countEventMedia } from "@/lib/globe/count-event-media";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  findPersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type CreatePersonalGlobePinResult = {
  pin: PersonalGlobePin;
  created: boolean;
};

function uniqueViewerThreadIds(ids: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Feed experience → personal globe slot pin (1-tap). */
export function createPersonalGlobePinFromEvent(input: {
  event: EventCandidate;
  experienceTitle?: string | null;
  shareWithPeerThreadIds?: readonly string[];
  now?: Date;
}): CreatePersonalGlobePinResult {
  const existing = findPersonalGlobePinByEventId(input.event.id);
  if (existing) {
    return { pin: existing, created: false };
  }

  const plan = readPlanContextFromEvent(input.event);
  const coords = resolveEventGlobeCoords(input.event);
  const { photoCount, videoCount } = countEventMedia(input.event);
  const now = input.now ?? new Date();

  const startedAtIso =
    input.event.datetime?.trim() ||
    plan?.windowStartIso?.trim() ||
    now.toISOString();

  const pin: PersonalGlobePin = {
    pinId: `pgpin:${input.event.id}`,
    eventId: input.event.id,
    lat: coords.lat,
    lng: coords.lng,
    placeLabel: coords.placeLabel,
    experienceTitle:
      input.experienceTitle?.trim() ||
      plan?.title?.trim() ||
      input.event.title.trim(),
    photoCount,
    videoCount,
    createdAtIso: startedAtIso,
    acl: {
      viewerPeerThreadIds: uniqueViewerThreadIds([
        ...(input.shareWithPeerThreadIds ?? []),
        plan?.peerThreadId,
      ]),
    },
  };

  upsertPersonalGlobePin(pin);
  return { pin, created: true };
}
