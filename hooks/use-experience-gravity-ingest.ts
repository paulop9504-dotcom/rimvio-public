"use client";

import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { detectExperienceBurst } from "@/lib/experience-gravity/detect-experience-burst";
import {
  canSurfaceExperienceBurst,
  markExperienceBurstShown,
} from "@/lib/experience-gravity/experience-burst-session";
import { emitExperienceBurstDetected } from "@/lib/experience-gravity/experience-burst-events";
import { ingestExperienceBurst } from "@/lib/ingest/ingest-experience-burst";
import { scanRecentMediaContexts } from "@/lib/ingest/scan-recent-media-contexts";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import {
  GPS_PINGS_UPDATED,
} from "@/lib/location-ping/gps-ping-store";
import {
  listMediaSpacetimeContexts,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";

const DEBOUNCE_MS = 4_000;

export function useExperienceGravityIngest(input?: { enabled?: boolean }) {
  const enabled = input?.enabled ?? true;

  const evaluate = useCallback(async () => {
    if (!enabled) {
      return;
    }

    await scanRecentMediaContexts();

    const contexts = await listMediaSpacetimeContexts();
    const burst = detectExperienceBurst({
      contexts,
      events: listLifeEventCandidates(),
    });
    if (!burst) {
      return;
    }
    if (!canSurfaceExperienceBurst(burst.burstId)) {
      return;
    }

    if (burst.targetEventId) {
      await ingestExperienceBurst(burst);
    }

    markExperienceBurstShown(burst.burstId);
    emitExperienceBurstDetected(burst);

    toast(burst.recallLine, {
      description: burst.targetEventId
        ? `${burst.title} · 맞아요 확인`
        : `${burst.title} · 경험 후보`,
      duration: 6_000,
    });
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
    window.addEventListener(MEDIA_SPACETIME_UPDATED, schedule);
    window.addEventListener(GPS_PINGS_UPDATED, schedule);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, schedule);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      window.removeEventListener(MEDIA_SPACETIME_UPDATED, schedule);
      window.removeEventListener(GPS_PINGS_UPDATED, schedule);
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, schedule);
    };
  }, [enabled, evaluate]);
}
