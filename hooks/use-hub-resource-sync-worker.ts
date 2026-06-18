"use client";

import { useEffect, useRef } from "react";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readAppForeground } from "@/lib/globe/resource/build-api-wakeup-context";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import {
  hubResourceSyncRevisionKey,
  planHubResourceSyncJobs,
} from "@/lib/globe/resource/plan-hub-resource-sync-jobs";
import { runHubResourceSyncWorker } from "@/lib/globe/resource/run-hub-resource-sync-worker";

const SYNC_DEBOUNCE_MS = 400;

/**
 * Hub rank revision → ResourceSyncWorker.
 * Runs after ranked[] changes; ApiWakeupController gates each provider fetch.
 */
export function useHubResourceSyncWorker(input: {
  activeEventId: string | null | undefined;
  ranked: readonly RankedContextResource[];
  lat?: number | null;
  lng?: number | null;
  enabled?: boolean;
}) {
  const inflightRef = useRef<string | null>(null);
  const lastCompletedRef = useRef<string | null>(null);

  useEffect(() => {
    if (input.enabled === false) {
      return;
    }

    const eventId = input.activeEventId?.trim();
    if (!eventId || input.ranked.length === 0) {
      return;
    }

    const event = findLifeEventCandidate(eventId);
    if (!event) {
      return;
    }

    const revisionKey = hubResourceSyncRevisionKey({
      contextEventId: eventId,
      ranked: input.ranked,
      lat: input.lat,
      lng: input.lng,
    });

    const jobs = planHubResourceSyncJobs({
      ranked: input.ranked,
      event,
      lat: input.lat,
      lng: input.lng,
      appForeground: readAppForeground(),
    });

    if (jobs.length === 0) {
      return;
    }

    if (lastCompletedRef.current === revisionKey) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (inflightRef.current === revisionKey) {
        return;
      }
      inflightRef.current = revisionKey;

      void runHubResourceSyncWorker({
        ranked: input.ranked,
        event,
        lat: input.lat,
        lng: input.lng,
        appForeground: readAppForeground(),
      })
        .then((result) => {
          if (result.synced.length > 0) {
            lastCompletedRef.current = result.revisionKey;
          }
        })
        .finally(() => {
          if (inflightRef.current === revisionKey) {
            inflightRef.current = null;
          }
        });
    }, SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [input.activeEventId, input.enabled, input.lat, input.lng, input.ranked]);
}
