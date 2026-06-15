"use client";

import { useEffect, useState } from "react";

/** One full 360° longitude cycle (ms). */
export const GLOBE_IDLE_SPIN_PERIOD_MS = 90_000;

/**
 * Continuous eastward longitude drift for equirectangular globe surfaces.
 * Pauses while the user is dragging / pinching.
 */
export function useGlobeIdleSpin(input: {
  enabled?: boolean;
  paused?: boolean;
  periodMs?: number;
}): number {
  const { enabled = true, paused = false, periodMs = GLOBE_IDLE_SPIN_PERIOD_MS } =
    input;
  const [shiftX, setShiftX] = useState(0);

  useEffect(() => {
    if (!enabled || paused) {
      return;
    }

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const degreesPerMs = 360 / periodMs;
      setShiftX((current) => {
        const next = current + (delta * degreesPerMs * 100) / 360;
        return next >= 100 ? next - 100 : next;
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, paused, periodMs]);

  return shiftX;
}
