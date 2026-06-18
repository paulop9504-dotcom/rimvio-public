import type { TrafficContext } from "@/lib/context-resolver/types";

function cityFromLabel(label: string): string | null {
  if (/서울|seoul/i.test(label)) {
    return "seoul";
  }
  if (/대전|daejeon/i.test(label)) {
    return "daejeon";
  }
  if (/강남|gangnam/i.test(label)) {
    return "seoul";
  }
  if (/수서|suseo/i.test(label)) {
    return "seoul";
  }
  return null;
}

/** Sync traffic heuristic — mirrors TrafficProvider for pure read paths. */
export function resolveSyncTrafficContext(
  destination: string,
  originHint = "대전",
): TrafficContext {
  const originCity = cityFromLabel(originHint) ?? "daejeon";
  const destCity = cityFromLabel(destination);

  if (destCity === "seoul" && originCity !== "seoul") {
    return {
      travel_minutes: 102,
      delay_minutes: 18,
      distance_label: `${originHint} → ${destination}`,
    };
  }

  if (/강남/.test(destination)) {
    return {
      travel_minutes: 35,
      delay_minutes: 18,
      distance_label: `현재 위치 → ${destination}`,
    };
  }

  return {
    travel_minutes: 28,
    delay_minutes: 8,
    distance_label: `현재 위치 → ${destination}`,
  };
}
