"use client";

import { useEffect, useMemo, useState } from "react";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model/candidates-updated";
import { SYNAPSE_UPDATED_EVENT } from "@/lib/synaptic/synapse-engine";
import { SURFACE_IGNORE_OBSERVED_EVENT } from "@/lib/surface-composition/surface-ux-events";
import {
  resolveSurfaces,
  selectSurfacesForChannel,
  type ResolveSurfacesInput,
} from "@/lib/surface-engine";
import type { SurfaceBuildContext } from "@/lib/surface-engine/surface-contract";

export type UseSurfaceEngineInput = Omit<ResolveSurfacesInput, "context"> & {
  context?: SurfaceBuildContext;
};

/**
 * Canonical Surface Engine subscription for UI shells.
 * Components must render `feed` / `chat` / `calendar` — never compose surfaces locally.
 */
export function useSurfaceEngine(input: UseSurfaceEngineInput = {}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, onUpdate);
    window.addEventListener(SYNAPSE_UPDATED_EVENT, onUpdate);
    window.addEventListener(SURFACE_IGNORE_OBSERVED_EVENT, onUpdate);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, onUpdate);
      window.removeEventListener(SYNAPSE_UPDATED_EVENT, onUpdate);
      window.removeEventListener(SURFACE_IGNORE_OBSERVED_EVENT, onUpdate);
    };
  }, []);

  const result = useMemo(() => {
    void tick;
    try {
      return resolveSurfaces({
        ...input,
        context: {
          now: new Date(),
          ...input.context,
        },
        timelineContext: {
          now: input.context?.now ?? new Date(),
          focusedEcId: input.timelineContext?.focusedEcId,
          recentEcIds: input.timelineContext?.recentEcIds,
        },
      });
    } catch (error) {
      console.error("[useSurfaceEngine] resolveSurfaces failed", error);
      return resolveSurfaces({
        context: { now: new Date() },
        dateKey: input.dateKey,
      });
    }
  }, [
    tick,
    input.dateKey,
    input.context?.dateKey,
    input.context?.focusedSurfaceId,
    input.context?.completedActionIds?.join(","),
    input.context?.dismissedSurfaceIds?.join(","),
  ]);

  const feed = useMemo(
    () => selectSurfacesForChannel(result.routes, "FEED"),
    [result.routes],
  );
  const chat = useMemo(
    () => selectSurfacesForChannel(result.routes, "CHAT"),
    [result.routes],
  );
  const calendar = useMemo(
    () => selectSurfacesForChannel(result.routes, "CALENDAR"),
    [result.routes],
  );

  return {
    result,
    routes: result.routes,
    surfaces: result.surfaces,
    feed,
    chat,
    calendar,
  };
}
