import { projectExperienceRoom } from "@/lib/experience-room/project-experience-room";
import { mapLegacyPinToFoundationPin } from "@/lib/shared-globe/map-legacy-globe-pin";
import { resolveSharedGlobeId } from "@/lib/shared-globe/shared-globe-id";
import type {
  SharedGlobe,
  SharedGlobeMember,
} from "@/lib/shared-globe/shared-globe-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";

function membersFromRoom(
  experienceRoom: ReturnType<typeof projectExperienceRoom>,
  extraMembers?: readonly SharedGlobeMember[],
): SharedGlobeMember[] {
  const map = new Map<string, SharedGlobeMember>();

  for (const participant of experienceRoom.participants) {
    const name = participant.displayName.trim();
    if (!name) {
      continue;
    }
    map.set(name, {
      displayName: name,
      userId: participant.userId,
      role: participant.role === "host" ? "owner" : "member",
      joinedAt: experienceRoom.createdAt,
    });
  }

  for (const member of extraMembers ?? []) {
    const name = member.displayName.trim();
    if (!name) {
      continue;
    }
    if (!map.has(name)) {
      map.set(name, member);
    }
  }

  return [...map.values()];
}

/** Pure read — SharedGlobe projection above ExperienceRoom. */
export function projectSharedGlobe(input: {
  primaryEvent: EventCandidate;
  threadId: string;
  globePins?: readonly SharedGlobePin[];
  extraMembers?: readonly SharedGlobeMember[];
  createdAt?: string;
}): SharedGlobe {
  const experienceRoom = projectExperienceRoom({
    primaryEvent: input.primaryEvent,
    globePins: input.globePins,
  });

  const pins = (input.globePins ?? []).map(mapLegacyPinToFoundationPin);
  const threadId = input.threadId.trim() || experienceRoom.threadIds[0] || "";

  return {
    id: resolveSharedGlobeId(experienceRoom.id),
    experienceRoomId: experienceRoom.id,
    threadId,
    title: experienceRoom.title,
    members: membersFromRoom(experienceRoom, input.extraMembers),
    pins,
    experiences: [...experienceRoom.eventIds],
    createdAt: input.createdAt ?? experienceRoom.createdAt,
    layerId: "shared_graph",
    isEmpty: pins.length === 0,
  };
}
