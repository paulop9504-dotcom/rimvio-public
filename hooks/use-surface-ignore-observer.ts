"use client";

import { useEffect, useRef } from "react";
import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import { commitSurfaceIgnoreObservation } from "@/lib/surface-composition/surface-ignore-bridge";
import type { SurfaceIgnoreObservedDetail } from "@/lib/surface-composition/surface-ux-events";

const DEFAULT_IGNORE_MS = 90_000;
const CRITICAL_IGNORE_MS = 45_000;

export type UseSurfaceIgnoreObserverInput = {
  surfaceId: string | null;
  capabilityId: CapabilityId | null;
  priorityBand?: "critical" | "high" | "medium" | "low";
  enabled?: boolean;
  /** Reset timer when user taps primary (dispatch). */
  resetToken?: number;
  onIgnored?: (detail: SurfaceIgnoreObservedDetail) => void;
};

/**
 * Fires one ignore observation per stable primary if user does not act in time.
 */
export function useSurfaceIgnoreObserver(input: UseSurfaceIgnoreObserverInput): void {
  const firedRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIgnoredRef = useRef(input.onIgnored);
  onIgnoredRef.current = input.onIgnored;

  const ignoreMs =
    input.priorityBand === "critical" ? CRITICAL_IGNORE_MS : DEFAULT_IGNORE_MS;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!input.enabled || !input.surfaceId || !input.capabilityId) {
      return;
    }

    const key = `${input.surfaceId}:${input.capabilityId}`;
    if (firedRef.current === key) {
      return;
    }

    timerRef.current = setTimeout(() => {
      if (firedRef.current === key) {
        return;
      }
      firedRef.current = key;
      const detail: SurfaceIgnoreObservedDetail = {
        surfaceId: input.surfaceId!,
        capabilityId: input.capabilityId!,
      };
      commitSurfaceIgnoreObservation(detail);
      if (typeof console !== "undefined") {
        console.debug("[Rimvio] SURFACE_IGNORE_OBSERVED", {
          ...detail,
          afterMs: ignoreMs,
        });
      }
      onIgnoredRef.current?.(detail);
    }, ignoreMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    input.surfaceId,
    input.capabilityId,
    input.enabled,
    input.priorityBand,
    input.resetToken,
    ignoreMs,
  ]);
}
