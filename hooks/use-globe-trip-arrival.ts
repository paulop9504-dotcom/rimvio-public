"use client";

import { useEffect, useRef } from "react";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import { useGpsArrivalRecall } from "@/hooks/use-gps-arrival-recall";

export type GlobeTripArrivalHandlers = {
  onArrival: (input: {
    placeLabel: string;
    lat: number;
    lng: number;
    recallEventId: string;
    recallLine: string;
  }) => void;
};

/** Trip — fly + surface nearby personal contexts on GPS arrival recall. */
export function useGlobeTripArrival(
  handlers: GlobeTripArrivalHandlers,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const { recall } = useGpsArrivalRecall({ enabled });
  const lastKeyRef = useRef<string | null>(null);
  const onArrivalRef = useRef(handlers.onArrival);
  onArrivalRef.current = handlers.onArrival;

  useEffect(() => {
    if (!recall || !enabled) {
      return;
    }
    if (lastKeyRef.current === recall.sessionKey) {
      return;
    }
    lastKeyRef.current = recall.sessionKey;

    const coords = resolvePlaceCoordinates(recall.placeLabel);
    onArrivalRef.current({
      placeLabel: recall.placeLabel,
      lat: coords.lat,
      lng: coords.lng,
      recallEventId: recall.recallEventId,
      recallLine: recall.recallLine,
    });
  }, [enabled, recall]);
}
