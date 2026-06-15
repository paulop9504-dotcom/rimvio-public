"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";
import { fetchGlobePinsIndex } from "@/lib/globe/fetch-globe-pins-index";
import { projectionRecordToExternalTrace } from "@/lib/globe/pin-projection-index-record";
import { PIN_DOMAIN_SHIP_PHASE } from "@/lib/globe/pin-domain-registry";
import { bboxFromGlobePinsNear } from "@/lib/globe/query-pin-projection-index";

const DEFAULT_RADIUS_M = 900;

export type UseGlobePinsPlatformExternalInput = {
  enabled?: boolean;
  lat: number | null;
  lng: number | null;
  radiusM?: number;
};

/** P2 — external layer via unified `/api/globe/pins` index (replaces direct trace fetch). */
export function useGlobePinsPlatformExternal(
  input: UseGlobePinsPlatformExternalInput,
) {
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

    const radiusM = input.radiusM ?? DEFAULT_RADIUS_M;
    const bbox = bboxFromGlobePinsNear({
      lat: input.lat,
      lng: input.lng,
      radiusM,
    });

    try {
      const response = await fetchGlobePinsIndex({
        query: { mode: "near", lat: input.lat, lng: input.lng, radiusM, bbox },
        includeExternal: true,
        signal: controller.signal,
      });
      const next = response.external
        .map((record) => projectionRecordToExternalTrace(record))
        .filter((row): row is ExternalGlobeTrace => Boolean(row));
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
