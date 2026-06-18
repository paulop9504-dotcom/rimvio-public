"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";
import { fetchExternalGlobeTracesNear } from "@/lib/globe/fetch-external-globe-traces-near";
import { PIN_DOMAIN_SHIP_PHASE } from "@/lib/globe/pin-domain-registry";

export type UseExternalGlobeTracesInput = {
  enabled?: boolean;
  lat: number | null;
  lng: number | null;
  radiusM?: number;
};

/** P2 — poll external traces near the current globe focal point. */
export function useExternalGlobeTraces(input: UseExternalGlobeTracesInput) {
  const enabled = (input.enabled ?? true) && PIN_DOMAIN_SHIP_PHASE >= 2;
  const [traces, setTraces] = useState<ExternalGlobeTrace[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || input.lat == null || input.lng == null) {
      setTraces([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const next = await fetchExternalGlobeTracesNear({
        lat: input.lat,
        lng: input.lng,
        radiusM: input.radiusM,
        signal: controller.signal,
      });
      setTraces(next);
    } catch {
      if (!controller.signal.aborted) {
        setTraces([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, input.lat, input.lng, input.radiusM]);

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  return { traces, loading, refresh };
}
