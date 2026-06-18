"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrafficContext } from "@/lib/context-resolver/types";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlanContextForCalendarRow } from "@/lib/plan-context/project-plan-to-feed-slot";
import { fetchTrafficContextClient } from "@/lib/traffic/fetch-traffic-context-client";

function collectDestinations(
  slots: readonly FeedTodaySlot[],
  eventsById?: ReadonlyMap<string, EventCandidate>,
): string[] {
  const destinations: string[] = [];
  const seen = new Set<string>();

  for (const slot of slots) {
    if (slot.kind !== "calendar" || !eventsById) {
      continue;
    }
    const plan = resolvePlanContextForCalendarRow(slot.row, eventsById);
    const destination = plan?.place?.trim() || slot.row.event.title.trim();
    if (!destination || seen.has(destination)) {
      continue;
    }
    seen.add(destination);
    destinations.push(destination);
  }

  return destinations;
}

/** Live traffic for plan-backed feed slots — read-only client fetch. */
export function useFeedPlanTraffic(
  slots: readonly FeedTodaySlot[],
  eventsById?: ReadonlyMap<string, EventCandidate>,
): ReadonlyMap<string, TrafficContext> {
  const destinations = useMemo(
    () => collectDestinations(slots, eventsById),
    [slots, eventsById],
  );

  const requestKey = useMemo(() => destinations.join("|"), [destinations]);

  const [trafficByDestination, setTrafficByDestination] = useState<
    ReadonlyMap<string, TrafficContext>
  >(() => new Map());

  useEffect(() => {
    if (destinations.length === 0) {
      setTrafficByDestination(new Map());
      return;
    }

    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        destinations.map(async (destination) => {
          const traffic = await fetchTrafficContextClient({ destination });
          return traffic ? ([destination, traffic] as const) : null;
        }),
      );

      if (cancelled) {
        return;
      }

      const next = new Map<string, TrafficContext>();
      for (const entry of entries) {
        if (entry) {
          next.set(entry[0], entry[1]);
        }
      }
      setTrafficByDestination(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  return trafficByDestination;
}
