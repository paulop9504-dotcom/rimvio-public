"use client";

import { useCallback, useEffect, useState } from "react";
import { SURFACE_IGNORE_OBSERVED_EVENT } from "@/lib/surface-composition/surface-ux-events";
import type { SurfaceIgnoreObservedDetail } from "@/lib/surface-composition/surface-ux-events";

const DEFAULT_CLEAR_MS = 6000;

export function useSurfaceTransientHint(clearMs = DEFAULT_CLEAR_MS) {
  const [hint, setHint] = useState<string | null>(null);

  const showHint = useCallback((message: string) => {
    setHint(message);
  }, []);

  const clearHint = useCallback(() => {
    setHint(null);
  }, []);

  useEffect(() => {
    if (!hint) {
      return;
    }
    const timer = window.setTimeout(() => setHint(null), clearMs);
    return () => window.clearTimeout(timer);
  }, [hint, clearMs]);

  useEffect(() => {
    const onIgnore = (event: Event) => {
      const detail = (event as CustomEvent<SurfaceIgnoreObservedDetail>).detail;
      void detail;
      showHint("나중에 다시 꺼낼 수 있어요 — 지금은 쉬어도 돼요.");
    };
    window.addEventListener(SURFACE_IGNORE_OBSERVED_EVENT, onIgnore);
    return () => window.removeEventListener(SURFACE_IGNORE_OBSERVED_EVENT, onIgnore);
  }, [showHint]);

  return { hint, showHint, clearHint };
}
