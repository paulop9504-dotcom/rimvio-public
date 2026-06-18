import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  GLOBE_CONTEXT_VISIBILITY_EXTERNAL,
  GLOBE_CONTEXT_VISIBILITY_PRIVATE,
  type GlobeContextVisibility,
} from "@/lib/globe/globe-context-visibility";
import { readGlobeContextVisibility } from "@/lib/globe/set-globe-context-visibility";
import { globeTraceCellKey } from "@/lib/globe/globe-trace-cell";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type PublishGlobePinRemoteInput = {
  pin: PersonalGlobePin;
  visibility: GlobeContextVisibility;
};

/** Build remote row payload including geo index columns. */
export function buildPersonalGlobePinRemoteRow(input: PublishGlobePinRemoteInput) {
  const event = findLifeEventCandidate(input.pin.eventId);
  const visibility = event
    ? readGlobeContextVisibility(event)
    : input.visibility;

  return {
    event_id: input.pin.eventId,
    pin: input.pin,
    visibility,
    lat: input.pin.lat,
    lng: input.pin.lng,
    cell_key: globeTraceCellKey(input.pin.lat, input.pin.lng),
    updated_at: new Date().toISOString(),
  };
}

export function visibilityFromEventMetadata(
  metadata: Record<string, unknown> | null | undefined,
): GlobeContextVisibility {
  return metadata?.globeContextVisibility === GLOBE_CONTEXT_VISIBILITY_EXTERNAL
    ? GLOBE_CONTEXT_VISIBILITY_EXTERNAL
    : GLOBE_CONTEXT_VISIBILITY_PRIVATE;
}

export { GLOBE_CONTEXT_VISIBILITY_EXTERNAL, GLOBE_CONTEXT_VISIBILITY_PRIVATE };
