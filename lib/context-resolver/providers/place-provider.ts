import { queryNearbyPlaces } from "@/lib/context-resolver/places/query-nearby-places";
import { resolvePlacePreference } from "@/lib/context-resolver/places/place-preference";
import { enrichPlaceCandidates } from "@/lib/context-resolver/places/rank-place-candidates";
import type {
  PlaceDiscoveryContext,
  PlaceDiscoveryCriteria,
} from "@/lib/context-resolver/places/types";
import type { ContextProvider, ContextResolveInput } from "@/lib/context-resolver/types";

export type { PlaceDiscoveryContext } from "@/lib/context-resolver/places/types";

export class PlaceProvider implements ContextProvider<PlaceDiscoveryContext | null> {
  readonly id = "place";

  async getContext(
    location: { lat: number; lng: number },
    criteria: PlaceDiscoveryCriteria
  ): Promise<PlaceDiscoveryContext> {
    const preference = await resolvePlacePreference({ vibe: criteria.vibe });
    const raw = await queryNearbyPlaces({ lat: location.lat, lng: location.lng, criteria });
    const candidates = enrichPlaceCandidates({
      candidates: raw,
      origin: location,
      criteria,
      preference,
    });

    return { criteria, candidates, preference };
  }

  async resolve(input: ContextResolveInput): Promise<PlaceDiscoveryContext | null> {
    if (!input.discovery) {
      return null;
    }

    const lat = input.discovery.origin.lat;
    const lng = input.discovery.origin.lng;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return null;
    }

    return this.getContext({ lat, lng }, input.discovery.criteria);
  }
}

export const placeProvider = new PlaceProvider();
