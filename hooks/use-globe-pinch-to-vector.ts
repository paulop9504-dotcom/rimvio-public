"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { GlobeSurfaceMode } from "@/lib/globe/resolve-globe-surface-mode";

export type UseGlobePinchToVectorOptions = {
  hubRef: RefObject<HTMLElement | null>;
  surfaceModeRef: RefObject<GlobeSurfaceMode>;
  /** Return POV when pinch should hand off; null keeps globe.gl gesture. */
  resolvePinchHandoff: () => { lat: number; lng: number; altitude: number } | null;
  onPinchEnter: (pov: { lat: number; lng: number; altitude: number }) => void;
  enabled?: boolean;
};

/** Two-finger pinch on 3D globe — enter MapLibre vector when neighborhood scale. */
export function useGlobePinchToVector({
  hubRef,
  surfaceModeRef,
  resolvePinchHandoff,
  onPinchEnter,
  enabled = true,
}: UseGlobePinchToVectorOptions) {
  const resolveRef = useRef(resolvePinchHandoff);
  const onEnterRef = useRef(onPinchEnter);
  resolveRef.current = resolvePinchHandoff;
  onEnterRef.current = onPinchEnter;

  useEffect(() => {
    const hub = hubRef.current;
    if (!hub || !enabled) {
      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      if (surfaceModeRef.current !== "globe3d") {
        return;
      }
      if (event.touches.length < 2) {
        return;
      }
      const pov = resolveRef.current();
      if (!pov) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onEnterRef.current(pov);
    };

    hub.addEventListener("touchstart", onTouchStart, { capture: true, passive: false });
    return () => {
      hub.removeEventListener("touchstart", onTouchStart, { capture: true });
    };
  }, [enabled, hubRef, surfaceModeRef]);
}
