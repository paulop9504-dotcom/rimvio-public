import type { EventCandidate } from "@/lib/events/event-candidate";
import type { LifeProjections } from "@/lib/life-read-model/types";
import type { PersonalReadFactSlice } from "@/lib/personal-read-model/types";
import type { LinkRow } from "@/types/database";

const RECENT_EVENT_CAP = 12;

function eventRecencyMs(event: EventCandidate): number {
  const raw = event.datetime ?? event.updatedAt ?? event.createdAt;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

export function mapFactSlice(input: {
  life: LifeProjections;
  activeLink?: Pick<LinkRow, "id" | "domain" | "category" | "title"> | null;
}): PersonalReadFactSlice {
  const recentEventIds = [...input.life.events]
    .sort((a, b) => eventRecencyMs(b) - eventRecencyMs(a))
    .slice(0, RECENT_EVENT_CAP)
    .map((row) => row.id);

  const schedule = input.life.existingSchedule;

  const linkSummaries = input.activeLink
    ? [
        {
          id: input.activeLink.id,
          domain: input.activeLink.domain,
          category: input.activeLink.category ?? "link",
          title: input.activeLink.title,
        },
      ]
    : [];

  return {
    recentEventIds,
    scheduleDateKey: input.life.dateKey,
    scheduleTaskCount: schedule.length,
    activeLinkIds: input.activeLink ? [input.activeLink.id] : [],
    linkSummaries,
  };
}
