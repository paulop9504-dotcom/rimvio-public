"use client";

import { useMemo, useState, useEffect } from "react";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model/candidates-updated";
import {
  readLastLoopWiringFrame,
  wireKillerLoops,
  type LoopWiringInput,
} from "@/lib/loop-wiring";

/**
 * Subscribe to last loop wiring frame — driven by signals only.
 * Pass fresh `input` when device/context facts update.
 */
export function useLoopWiring(input: LoopWiringInput = {}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, onUpdate);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, onUpdate);
  }, []);

  return useMemo(() => {
    void tick;
    const cached = readLastLoopWiringFrame();
    if (cached) {
      return cached;
    }
    return wireKillerLoops({ ...input, now: input.now ?? new Date() });
  }, [tick, input.dateKey, input.idleMinutes, input.firstUnlockToday]);
}
