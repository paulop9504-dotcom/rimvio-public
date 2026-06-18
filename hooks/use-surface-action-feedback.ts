"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SURFACE_MEMORY_UPDATED_EVENT } from "@/lib/memory/surface-memory-contract";

export type SurfaceActionFeedbackPhase = "idle" | "loading" | "success" | "error";

export type SurfaceActionFeedback = {
  phase: SurfaceActionFeedbackPhase;
  message?: string;
};

const SUCCESS_MS = 2600;
const ERROR_MS = 3200;

/**
 * Per primary-action feedback (loading / success / error) for Surface CTAs.
 */
export function useSurfaceActionFeedback() {
  const [byKey, setByKey] = useState<Record<string, SurfaceActionFeedback>>({});
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((key: string) => {
    const timer = timersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(key);
    }
  }, []);

  const scheduleIdle = useCallback(
    (key: string, ms: number) => {
      clearTimer(key);
      timersRef.current.set(
        key,
        setTimeout(() => {
          setByKey((prev) => {
            if (prev[key]?.phase === "loading") {
              return prev;
            }
            const next = { ...prev };
            delete next[key];
            return next;
          });
          timersRef.current.delete(key);
        }, ms),
      );
    },
    [clearTimer],
  );

  const patch = useCallback((key: string, feedback: SurfaceActionFeedback, autoClearMs?: number) => {
    setByKey((prev) => ({ ...prev, [key]: feedback }));
    if (autoClearMs != null) {
      scheduleIdle(key, autoClearMs);
    }
  }, [scheduleIdle]);

  const markLoading = useCallback(
    (key: string) => {
      clearTimer(key);
      patch(key, { phase: "loading" });
    },
    [clearTimer, patch],
  );

  const markSuccess = useCallback(
    (key: string, message: string) => {
      patch(key, { phase: "success", message }, SUCCESS_MS);
    },
    [patch],
  );

  const markError = useCallback(
    (key: string, message: string) => {
      patch(key, { phase: "error", message }, ERROR_MS);
    },
    [patch],
  );

  const getFeedback = useCallback(
    (key: string): SurfaceActionFeedback => byKey[key] ?? { phase: "idle" },
    [byKey],
  );

  useEffect(() => {
    const onMemory = () => {
      setByKey((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key]?.phase === "success") {
            delete next[key];
          }
        }
        return next;
      });
    };
    window.addEventListener(SURFACE_MEMORY_UPDATED_EVENT, onMemory);
    return () => {
      window.removeEventListener(SURFACE_MEMORY_UPDATED_EVENT, onMemory);
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  return {
    getFeedback,
    markLoading,
    markSuccess,
    markError,
  };
}
