"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import {
  canSurfaceGpsArrivalRecall,
  markGpsArrivalRecallShown,
} from "@/lib/feed/gps-arrival-recall-session";
import type { GpsArrivalRecall } from "@/lib/feed/resolve-gps-arrival-recall";
import { resolveGpsArrivalRecall } from "@/lib/feed/resolve-gps-arrival-recall";
import {
  GPS_PINGS_UPDATED,
  listRecentGpsPings,
} from "@/lib/location-ping/gps-ping-store";

const DEBOUNCE_MS = 3_000;

export function useGpsArrivalRecall(input: { enabled?: boolean }) {
  const enabled = input.enabled ?? true;
  const [recall, setRecall] = useState<GpsArrivalRecall | null>(null);

  const evaluate = useCallback(async () => {
    if (!enabled) {
      return;
    }
    const pings = await listRecentGpsPings();
    if (pings.length < 2) {
      return;
    }

    const candidate = resolveGpsArrivalRecall({
      pings,
      events: listLifeEventCandidates(),
    });
    if (!candidate) {
      return;
    }
    if (!canSurfaceGpsArrivalRecall(candidate.sessionKey)) {
      return;
    }

    markGpsArrivalRecallShown(candidate.sessionKey);
    setRecall(candidate);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        void evaluate();
      }, DEBOUNCE_MS);
    };

    schedule();
    window.addEventListener(GPS_PINGS_UPDATED, schedule);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, schedule);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      window.removeEventListener(GPS_PINGS_UPDATED, schedule);
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, schedule);
    };
  }, [enabled, evaluate]);

  const dismiss = useCallback(() => {
    setRecall(null);
  }, []);

  return { recall, dismiss };
}
