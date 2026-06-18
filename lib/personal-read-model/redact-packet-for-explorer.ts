import type { PersonalReadPacket } from "@/lib/personal-read-model/types";

/** Strip private-life fields before LLM when Scope AI = explorer. */
export function redactPacketForExplorer(
  packet: PersonalReadPacket,
): PersonalReadPacket {
  return {
    ...packet,
    meta: {
      ...packet.meta,
      activeContextTitle: null,
      location: packet.meta.location
        ? { ...packet.meta.location, label: null }
        : null,
    },
    fact: {
      ...packet.fact,
      recentEventIds: packet.fact.recentEventIds.slice(0, 4),
      activeLinkIds: [],
      linkSummaries: [],
    },
    experience: {
      ...packet.experience,
      focus: {
        eventId: packet.experience.focus.eventId,
        title: null,
        place: null,
        category: packet.experience.focus.category,
        visibility: "external",
      },
      hubLinks: packet.experience.hubLinks.map((row) => ({
        ...row,
        actionUrl: null,
      })),
      narrationHeadline: null,
    },
    meaning: {
      ...packet.meaning,
      relationshipLines: [],
      rollupAffinities: [],
    },
    recall: {
      eligibleTriggers: [],
      horizonInsights: [],
    },
  };
}
