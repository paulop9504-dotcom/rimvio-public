import type {
  ContextProvider,
  ContextResolveInput,
  LocationContext,
} from "@/lib/context-resolver/types";

/** LocationProvider — current position at resolve time. */
export class LocationProvider implements ContextProvider<LocationContext> {
  readonly id = "location";

  async resolve(input: ContextResolveInput): Promise<LocationContext> {
    const hint = input.event.origin_hint?.trim();
    if (hint) {
      return {
        label: hint,
        city: hint,
      };
    }

    return {
      label: "현재 위치",
      city: "대전",
      lat: 36.3504,
      lng: 127.3845,
    };
  }
}

export const locationProvider = new LocationProvider();
