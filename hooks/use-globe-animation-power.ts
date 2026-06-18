"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { GlobeInstance } from "globe.gl";
import {
  applyGlobeAnimationPower,
  GLOBE_IDLE_AFTER_MS,
  type GlobeAnimationPowerMode,
} from "@/lib/globe/globe-animation-power";

export function useGlobeAnimationPower(input: {
  globeRef: RefObject<GlobeInstance | null>;
  interactionRootRef: RefObject<HTMLElement | null>;
  suspended: boolean;
  enabled?: boolean;
}) {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef<GlobeAnimationPowerMode>("full");

  useEffect(() => {
    const globe = input.globeRef.current;
    const root = input.interactionRootRef.current;
    if (!input.enabled || !globe || !root) {
      return;
    }

    const applyMode = (mode: GlobeAnimationPowerMode) => {
      if (modeRef.current === mode) {
        return;
      }
      modeRef.current = mode;
      applyGlobeAnimationPower(globe, mode);
    };

    const clearIdleTimer = () => {
      if (idleTimerRef.current != null) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const scheduleIdlePause = () => {
      clearIdleTimer();
      idleTimerRef.current = setTimeout(() => {
        if (!input.suspended && document.visibilityState === "visible") {
          applyMode("suspended");
        }
      }, GLOBE_IDLE_AFTER_MS);
    };

    const markActive = () => {
      if (input.suspended || document.visibilityState !== "visible") {
        applyMode("suspended");
        return;
      }
      clearIdleTimer();
      applyMode("full");
      scheduleIdlePause();
    };

    const onControlEnd = () => {
      scheduleIdlePause();
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        clearIdleTimer();
        applyMode("suspended");
        return;
      }
      if (!input.suspended) {
        markActive();
      }
    };

    const controls = globe.controls();
    const activityEvents = ["pointerdown", "wheel", "touchstart"] as const;
    for (const eventName of activityEvents) {
      root.addEventListener(eventName, markActive, { passive: true });
    }
    controls.addEventListener("start", markActive);
    controls.addEventListener("change", markActive);
    controls.addEventListener("end", onControlEnd);
    document.addEventListener("visibilitychange", onVisibility);

    if (input.suspended) {
      clearIdleTimer();
      applyMode("suspended");
    } else if (document.visibilityState === "visible") {
      markActive();
    } else {
      applyMode("suspended");
    }

    return () => {
      clearIdleTimer();
      for (const eventName of activityEvents) {
        root.removeEventListener(eventName, markActive);
      }
      controls.removeEventListener("start", markActive);
      controls.removeEventListener("change", markActive);
      controls.removeEventListener("end", onControlEnd);
      document.removeEventListener("visibilitychange", onVisibility);
      applyGlobeAnimationPower(globe, "full");
      modeRef.current = "full";
    };
  }, [
    input.enabled,
    input.suspended,
    input.globeRef,
    input.interactionRootRef,
  ]);
}
