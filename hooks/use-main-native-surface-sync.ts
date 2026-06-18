"use client";

import { App } from "@capacitor/app";
import { useCallback, useEffect, useRef, useState } from "react";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readAppForeground } from "@/lib/globe/resource/build-api-wakeup-context";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import {
  mainNativeSurfaceRevisionKey,
  syncNativeMainSurface,
} from "@/lib/globe/resource/sync-native-main-surface";
import { isNativeShell } from "@/lib/native-bridge/rimvio-native-bridge";
import { buildResourceImpressionEvent } from "@/lib/telemetry/build-curation-telemetry-event";
import { resolveTelemetryUserSeed } from "@/lib/telemetry/hash-telemetry-user-id";
import { getCurationTelemetryLogger } from "@/lib/telemetry/telemetry-logger";

const SYNC_DEBOUNCE_MS = 350;

/**
 * Hub rank revision → native MAIN surface when app is backgrounded near gate time.
 * Foreground MAIN stays on GlobeHubResourceCarousel (web).
 */
export function useMainNativeSurfaceSync(input: {
  activeEventId: string | null | undefined;
  ranked: readonly RankedContextResource[];
  lat?: number | null;
  lng?: number | null;
  authUserId?: string | null;
  enabled?: boolean;
}) {
  const inflightRef = useRef<string | null>(null);
  const lastCompletedRef = useRef<string | null>(null);
  const nativeImpressionRevisionRef = useRef<string | null>(null);
  const userSeedRef = useRef(resolveTelemetryUserSeed(input.authUserId ?? null));
  const [appForeground, setAppForeground] = useState(() => readAppForeground());

  useEffect(() => {
    userSeedRef.current = resolveTelemetryUserSeed(input.authUserId ?? null);
  }, [input.authUserId]);

  useEffect(() => {
    nativeImpressionRevisionRef.current = null;
  }, [input.activeEventId]);

  useEffect(() => {
    if (!isNativeShell()) {
      return;
    }

    const syncVisibility = () => {
      setAppForeground(readAppForeground());
    };

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);

    const appState = App.addListener("appStateChange", ({ isActive }) => {
      setAppForeground(isActive);
    });

    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      void appState.then((handle) => handle.remove());
    };
  }, []);

  useEffect(() => {
    if (input.enabled === false || !isNativeShell()) {
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

    const revisionKey = mainNativeSurfaceRevisionKey({
      contextEventId: eventId,
      ranked: input.ranked,
    });

    if (lastCompletedRef.current === revisionKey && appForeground) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (inflightRef.current === revisionKey) {
        return;
      }
      inflightRef.current = revisionKey;

      void syncNativeMainSurface({
        ranked: input.ranked,
        event,
        appForeground,
      })
        .then((result) => {
          if (result.applied || result.note === "foreground_defer_to_web") {
            lastCompletedRef.current = revisionKey;
          }
          if (result.lifecycle === "end" && result.applied) {
            lastCompletedRef.current = revisionKey;
            nativeImpressionRevisionRef.current = null;
          }

          const contextId = eventId;
          const mainEntry = input.ranked[0];
          if (
            result.applied &&
            result.ok &&
            result.lifecycle !== "end" &&
            contextId &&
            mainEntry &&
            nativeImpressionRevisionRef.current !== revisionKey
          ) {
            nativeImpressionRevisionRef.current = revisionKey;
            getCurationTelemetryLogger().enqueue(
              buildResourceImpressionEvent({
                contextId,
                entry: mainEntry,
                lat: input.lat ?? null,
                lng: input.lng ?? null,
                userSeed: userSeedRef.current,
                surface: "native_main",
              }),
            );
          }
        })
        .finally(() => {
          if (inflightRef.current === revisionKey) {
            inflightRef.current = null;
          }
        });
    }, SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [appForeground, input.activeEventId, input.authUserId, input.enabled, input.lat, input.lng, input.ranked]);
}
