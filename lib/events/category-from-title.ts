import type { EventCandidateCategory } from "@/lib/events/event-candidate";

const TRAVEL_SIGNAL = /(?:공항|항공|여행|출장|탑승|비행|체크인|탑승권|호텔|check-?in)/iu;
const WORK_SIGNAL = /(?:업무|보고|출근|deadline|마감|보고서|미팅|회의|meeting)/iu;
const FOOD_SIGNAL = /(?:맛집|식당|카페|치킨|저녁|점심|배달|먹)/u;

/** Shared category inference for calendar-axis ingest adapters. */
export function categoryFromScheduleTitle(title: string): EventCandidateCategory {
  if (TRAVEL_SIGNAL.test(title)) {
    return "travel";
  }
  if (WORK_SIGNAL.test(title)) {
    return "work";
  }
  if (FOOD_SIGNAL.test(title)) {
    return "food";
  }
  return "schedule";
}
