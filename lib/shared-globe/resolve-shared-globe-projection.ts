import { projectExperienceRoom } from "@/lib/experience-room/project-experience-room";
import { buildSharedGlobeLayer } from "@/lib/shared-globe/build-shared-globe-layer";
import {
  evaluateSharedGlobeAutoCreate,
  type SharedGlobeAutoCreateSignals,
} from "@/lib/shared-globe/evaluate-shared-globe-auto-create";
import { projectSharedGlobe } from "@/lib/shared-globe/project-shared-globe";
import { tryAutoCreateSharedGlobe } from "@/lib/shared-globe/create-empty-shared-globe";
import type {
  SharedGlobe,
  SharedGlobeLayer,
} from "@/lib/shared-globe/shared-globe-types";
import type { ExperienceRoom } from "@/lib/experience-room/experience-room-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";

export type SharedGlobeProjection = {
  experienceRoom: ExperienceRoom;
  globe: SharedGlobe;
  layer: SharedGlobeLayer;
  autoCreate: SharedGlobeAutoCreateSignals;
};

/** Pure read — ExperienceRoom → SharedGlobe → layer stack entry. */
export function resolveSharedGlobeProjection(input: {
  primaryEvent: EventCandidate;
  threadId: string;
  globePins?: readonly SharedGlobePin[];
}): SharedGlobeProjection {
  const globePins = input.globePins ?? [];
  const experienceRoom = projectExperienceRoom({
    primaryEvent: input.primaryEvent,
    globePins,
  });
  const globe = projectSharedGlobe({
    primaryEvent: input.primaryEvent,
    threadId: input.threadId,
    globePins,
  });
  const layer = buildSharedGlobeLayer(globe);
  const autoCreate = evaluateSharedGlobeAutoCreate({
    experienceRoom,
    primaryEvent: input.primaryEvent,
    globePins,
  });

  return { experienceRoom, globe, layer, autoCreate };
}

export function resolveSharedGlobeWithAutoCreate(input: {
  primaryEvent: EventCandidate;
  threadId: string;
  globePins?: readonly SharedGlobePin[];
  ownerDisplayName: string;
  ownerUserId?: string;
}): SharedGlobeProjection & {
  createdGlobe: ReturnType<typeof tryAutoCreateSharedGlobe>;
} {
  const projection = resolveSharedGlobeProjection(input);
  const createdGlobe = tryAutoCreateSharedGlobe({
    experienceRoom: projection.experienceRoom,
    primaryEvent: input.primaryEvent,
    threadId: input.threadId,
    ownerDisplayName: input.ownerDisplayName,
    ownerUserId: input.ownerUserId,
    eligible: projection.autoCreate.eligible,
  });

  if (!createdGlobe) {
    return { ...projection, createdGlobe: null };
  }

  return {
    ...resolveSharedGlobeProjection({
      primaryEvent: {
        ...input.primaryEvent,
        metadata: createdGlobe.metadataPatch,
      },
      threadId: input.threadId,
      globePins: input.globePins,
    }),
    createdGlobe,
  };
}
