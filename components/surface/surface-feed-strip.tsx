"use client";

import type { RankedSurface } from "@/lib/surface-engine/surface-contract";
import type { CapabilityId } from "@/lib/capability-registry";
import { SurfaceCompositionRuntime } from "@/components/surface-composition/surface-composition-runtime";
import { composeSurfaceFrame } from "@/lib/surface-composition";
import { useMemo } from "react";

export type SurfaceFeedStripProps = {
  surfaces: readonly RankedSurface[];
  uxState?: import("@/lib/surface-engine/surface-contract").SurfaceUxState;
  computedAt?: string;
  onDispatchCapability: (
    surface: RankedSurface,
    actionId: string,
    capabilityId: CapabilityId,
  ) => void;
  className?: string;
};

/**
 * @deprecated Prefer `SurfaceCompositionRuntime` + `useSurfaceComposition`.
 * Thin adapter for legacy call sites.
 */
export function SurfaceFeedStrip({
  surfaces,
  uxState = "active",
  computedAt,
  onDispatchCapability,
  className,
}: SurfaceFeedStripProps) {
  const frame = useMemo(
    () =>
      composeSurfaceFrame(
        {
          contractVersion: 1,
          computedAt: computedAt ?? new Date().toISOString(),
          surfaces,
          routes: { FEED: surfaces, CHAT: [], CALENDAR: [] },
          uxState,
        },
        surfaces,
      ),
    [surfaces, uxState, computedAt],
  );

  if (!frame.layout.primary && frame.layout.secondary.length === 0) {
    return null;
  }

  return (
    <SurfaceCompositionRuntime
      frame={frame}
      onDispatchCapability={onDispatchCapability}
      className={className}
    />
  );
}
