import type { UserLocationWire } from "@/lib/global-brain/types";
import type { LocationMemoryWire } from "@/lib/location-memory/types";

export function buildUserLocationWire(input: {
  locationMemory?: LocationMemoryWire | null;
  message: string;
}): UserLocationWire | null {
  const memory = input.locationMemory;
  if (!memory?.recentActivities?.length && !memory?.lifeZone) {
    return null;
  }

  const recent = memory.recentActivities[0];
  const nearby =
    /(?:근처|주변|여기|이\s*근처|주변에)/u.test(input.message) ||
    /(?:맛집|카페|식당)\s*추천/u.test(input.message);

  return {
    label: memory.lifeZone?.label ?? recent?.region_label ?? recent?.place_label ?? null,
    lat: recent?.lat ?? null,
    lng: recent?.lng ?? null,
    spatial_mode: /(?:여기|this\s*place)/iu.test(input.message)
      ? "here_query"
      : nearby
        ? "nearby_query"
        : "unknown",
  };
}
