"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import {
  buildResourceDismissedEvent,
  buildResourceImpressionEvent,
  buildResourceManualPickEvent,
  buildTransactionConvertedEvent,
} from "@/lib/telemetry/build-curation-telemetry-event";
import { getCurationTelemetryLogger } from "@/lib/telemetry/telemetry-logger";
import { resolveTelemetryUserSeed } from "@/lib/telemetry/hash-telemetry-user-id";

type UseHubResourceCurationTelemetryInput = {
  contextId: string | null;
  ranked: readonly RankedContextResource[];
  index: number;
  lat?: number | null;
  lng?: number | null;
  authUserId?: string | null;
  enabled?: boolean;
};

/** Non-blocking Predictive Curation hooks for GlobeHubResourceCarousel. */
export function useHubResourceCurationTelemetry({
  contextId,
  ranked,
  index,
  lat = null,
  lng = null,
  authUserId = null,
  enabled = true,
}: UseHubResourceCurationTelemetryInput) {
  const mainCardRef = useRef<HTMLButtonElement | null>(null);
  const mainImpressionAtRef = useRef<number | null>(null);
  const impressedMainResourceIdRef = useRef<string | null>(null);
  const userSeedRef = useRef(resolveTelemetryUserSeed(authUserId));

  useEffect(() => {
    userSeedRef.current = resolveTelemetryUserSeed(authUserId);
  }, [authUserId]);

  const resolveMainEntry = useCallback((): RankedContextResource | null => {
    return ranked[0] ?? null;
  }, [ranked]);

  const computeDwellMs = useCallback((): number | null => {
    const started = mainImpressionAtRef.current;
    if (started === null) {
      return null;
    }
    return Math.max(0, Date.now() - started);
  }, []);

  const emitImpression = useCallback(
    (entry: RankedContextResource) => {
      if (!enabled || !contextId?.trim()) {
        return;
      }
      if (impressedMainResourceIdRef.current === entry.resource.resourceId) {
        return;
      }
      impressedMainResourceIdRef.current = entry.resource.resourceId;
      mainImpressionAtRef.current = Date.now();
      getCurationTelemetryLogger().enqueue(
        buildResourceImpressionEvent({
          contextId: contextId.trim(),
          entry,
          lat,
          lng,
          userSeed: userSeedRef.current,
          surface: "carousel_main",
        }),
      );
    },
    [contextId, enabled, lat, lng],
  );

  const emitMainDismissed = useCallback(
    (reason: "swipe_next" | "swipe_away" | "carousel_dot") => {
      if (!enabled || !contextId?.trim()) {
        return;
      }
      const entry = resolveMainEntry();
      if (!entry) {
        return;
      }
      getCurationTelemetryLogger().enqueue(
        buildResourceDismissedEvent({
          contextId: contextId.trim(),
          entry,
          lat,
          lng,
          userSeed: userSeedRef.current,
          dwellTimeMs: computeDwellMs(),
          dismissReason: reason,
        }),
      );
      mainImpressionAtRef.current = null;
    },
    [computeDwellMs, contextId, enabled, lat, lng, resolveMainEntry],
  );

  const emitManualPick = useCallback(
    (entry: RankedContextResource, carouselIndex: number) => {
      if (!enabled || !contextId?.trim() || carouselIndex <= 0) {
        return;
      }
      const systemRankIndex = ranked.findIndex(
        (row) => row.resource.resourceId === entry.resource.resourceId,
      );
      getCurationTelemetryLogger().enqueue(
        buildResourceManualPickEvent({
          contextId: contextId.trim(),
          entry,
          lat,
          lng,
          userSeed: userSeedRef.current,
          carouselIndex,
          systemRankIndex: systemRankIndex >= 0 ? systemRankIndex : carouselIndex,
        }),
      );
    },
    [contextId, enabled, lat, lng, ranked],
  );

  useEffect(() => {
    impressedMainResourceIdRef.current = null;
    mainImpressionAtRef.current = null;
  }, [contextId]);

  useEffect(() => {
    if (!enabled || index !== 0) {
      return;
    }
    const entry = ranked[0];
    if (!entry) {
      return;
    }

    const node = mainCardRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      emitImpression(entry);
      return;
    }

    const observer = new IntersectionObserver(
      (records) => {
        const record = records[0];
        if (record?.isIntersecting && record.intersectionRatio >= 0.45) {
          emitImpression(entry);
        }
      },
      { threshold: [0.45, 0.6] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [emitImpression, enabled, index, ranked]);

  const goToWithTelemetry = useCallback(
    (
      next: number,
      goTo: (next: number) => boolean,
      reason: "swipe_next" | "carousel_dot",
    ): boolean => {
      if (index === 0 && next > 0) {
        emitMainDismissed(reason);
      }
      return goTo(next);
    },
    [emitMainDismissed, index],
  );

  return {
    mainCardRef,
    emitMainDismissed,
    emitManualPick,
    goToWithTelemetry,
  };
}

export function emitTransactionConvertedTelemetry(input: {
  contextId: string;
  resourceId: string;
  sourceHubId: string;
  lat?: number | null;
  lng?: number | null;
  authUserId?: string | null;
  entry?: RankedContextResource | null;
  transactionKind?: "connect" | "purchase" | "sync";
}): void {
  getCurationTelemetryLogger().enqueue(
    buildTransactionConvertedEvent({
      contextId: input.contextId,
      resourceId: input.resourceId,
      sourceHubId: input.sourceHubId,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      userSeed: resolveTelemetryUserSeed(input.authUserId),
      entry: input.entry,
      transactionKind: input.transactionKind,
      createdResourceId: input.resourceId,
    }),
  );
}
