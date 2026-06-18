import {
  estimatePlaceTravelMinutes,
  formatArrivalClock,
} from "@/lib/context-resolver/places/estimate-place-arrival";
import type {
  PlaceCandidate,
  PlaceCandidateEnriched,
  PlaceDiscoveryCriteria,
  PlacePreferenceContext,
} from "@/lib/context-resolver/places/types";

function buildReason(input: {
  place: PlaceCandidate;
  criteria: PlaceDiscoveryCriteria;
  preference: PlacePreferenceContext;
  travelMinutes: number;
  arriveClock: string;
}): string {
  const parts: string[] = [];

  if (input.place.open_now) {
    parts.push("지금 영업 중");
  }

  if (input.place.naver_category) {
    parts.push(input.place.naver_category.replace(/^음식점>/, "").replace(/>/g, " · "));
  }

  if (input.criteria.vibe === "quiet" && input.place.vibes.includes("quiet")) {
    parts.push("조용한 분위기");
  }

  if (input.preference.shadow_hint && input.preference.visited_places.length > 0) {
    parts.push(input.preference.shadow_hint);
  } else if (input.place.rating >= 4.5) {
    parts.push("평점 높음");
  }

  parts.push(`${input.travelMinutes}분 거리 · ${input.arriveClock} 도착 예상`);

  return parts.join(", ");
}

export function enrichPlaceCandidates(input: {
  candidates: PlaceCandidate[];
  origin: { lat: number; lng: number };
  criteria: PlaceDiscoveryCriteria;
  preference: PlacePreferenceContext;
  now?: Date;
}): PlaceCandidateEnriched[] {
  const now = input.now ?? new Date();

  return input.candidates.map((place) => {
    const travelMinutes = estimatePlaceTravelMinutes({
      from: input.origin,
      to: { lat: place.lat, lng: place.lng },
    });
    const arriveClock = formatArrivalClock(travelMinutes, now);
    const visitedMatch = input.preference.visited_places.some((name) =>
      place.name.includes(name.replace(/ 전화| 주소/, ""))
    );

    return {
      ...place,
      travel_minutes: travelMinutes,
      arrive_at_clock: arriveClock,
      shadow_match: visitedMatch,
      reason: buildReason({
        place,
        criteria: input.criteria,
        preference: input.preference,
        travelMinutes,
        arriveClock,
      }),
    };
  });
}
