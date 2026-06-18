"use client";

import { useEffect, useRef } from "react";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { organizeAndCommitContextGarden } from "@/lib/globe/context-gardener/commit-context-garden";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { findLifeEventCandidate } from "@/lib/life-read-model";

const GARDEN_DEBOUNCE_MS = 350;

/**
 * Creation Context gardener — runs after rank revision changes.
 * Deterministic group · prune · sanitize · summary on EventCandidate metadata.
 */
export function useContextGardenOrganizer(input: {
  activeEventId: string | null | undefined;
  ranked: readonly RankedContextResource[];
  lat?: number | null;
  lng?: number | null;
  enabled?: boolean;
}) {
  const inflightRef = useRef<string | null>(null);

  useEffect(() => {
    if (input.enabled === false) {
      return;
    }

    const eventId = input.activeEventId?.trim();
    if (!eventId || input.ranked.length === 0) {
      return;
    }

    const event = findLifeEventCandidate(eventId);
    const panel = listContextHubServicesForEvent(event);
    if (!event || !panel) {
      return;
    }

    const revisionKey = [
      eventId,
      input.ranked.map((row) => `${row.resource.resourceId}:${row.rankScore}`).join(","),
      String(input.ranked.length),
    ].join("|");

    const timer = window.setTimeout(() => {
      if (inflightRef.current === revisionKey) {
        return;
      }
      inflightRef.current = revisionKey;

      try {
        organizeAndCommitContextGarden({
          event,
          ranked: input.ranked,
          services: panel.services,
        });
      } finally {
        if (inflightRef.current === revisionKey) {
          inflightRef.current = null;
        }
      }
    }, GARDEN_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [input.activeEventId, input.enabled, input.ranked]);
}
