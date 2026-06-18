import { fetchTrafficContext } from "@/lib/traffic/fetch-traffic-context";
import { fetchTrafficContextClient } from "@/lib/traffic/fetch-traffic-context-client";
import type { ContextProvider, ContextResolveInput, TrafficContext } from "@/lib/context-resolver/types";

/** TrafficProvider — Kakao Directions / geo estimate with keyword heuristic fallback. */
export class TrafficProvider implements ContextProvider<TrafficContext> {
  readonly id = "traffic";

  async resolve(input: ContextResolveInput): Promise<TrafficContext> {
    const destination = input.event.location?.trim();
    if (!destination) {
      return fetchTrafficContext({ destination: "목적지", originHint: input.event.origin_hint });
    }

    if (typeof window !== "undefined") {
      const client = await fetchTrafficContextClient({
        destination,
        originHint: input.event.origin_hint,
      });
      if (client) {
        return client;
      }
    }

    return fetchTrafficContext({
      destination,
      originHint: input.event.origin_hint,
    });
  }
}

export const trafficProvider = new TrafficProvider();
