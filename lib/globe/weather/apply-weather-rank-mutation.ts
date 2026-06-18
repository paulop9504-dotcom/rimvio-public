import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { readExecutionProfileId } from "@/lib/globe/passive-context/infer-execution-profile";
import type { EventCandidate } from "@/lib/events/event-candidate";

const HOT_WEATHER_C = 30;

/** Weather mutation — boost indoor/cool resources when hot (deterministic). */
export function applyWeatherRankMutation(input: {
  event: EventCandidate;
  ranked: readonly RankedContextResource[];
  tempC?: number | null;
}): RankedContextResource[] {
  const tempC = input.tempC ?? null;
  if (tempC == null || tempC < HOT_WEATHER_C) {
    return [...input.ranked];
  }

  const profileId = readExecutionProfileId(input.event.metadata);
  const hotOutdoorDay = profileId === "theme_park_day" || profileId === "outdoor_long_day";

  const mutated = input.ranked.map((entry) => {
    let bonus = 0;
    if (entry.resource.kind === "lodging_voucher") {
      bonus += 22;
    }
    if (entry.resource.kind === "ai_handoff") {
      bonus += 12;
    }
    if (hotOutdoorDay && entry.resource.sourceHubId === "lodging") {
      bonus += 8;
    }
    if (hotOutdoorDay && entry.resource.kind === "ticket") {
      bonus -= 6;
    }
    if (bonus === 0) {
      return entry;
    }
    return { ...entry, rankScore: entry.rankScore + bonus };
  });

  return mutated.sort((left, right) => {
    const delta = right.rankScore - left.rankScore;
    if (delta !== 0) {
      return delta;
    }
    return left.resource.label.localeCompare(right.resource.label, "ko");
  });
}

export function buildWeatherPrepLine(tempC: number | null | undefined): string | null {
  if (tempC == null || tempC < HOT_WEATHER_C) {
    return null;
  }
  return `오늘 ${Math.round(tempC)}° · 실내·휴식 쪽을 먼저 볼게요`;
}
