"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePendingBridgeInvites } from "@/hooks/use-pending-bridge-invites";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { listPendingGlobeLocationConfirms } from "@/lib/globe/list-pending-globe-location-confirms";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model";

const DISMISSED_KEY = "rimvio.globe-inbox-dismissed-locations";

function readDismissedLocationIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((row): row is string => typeof row === "string")
      : [];
  } catch {
    return [];
  }
}

function writeDismissedLocationIds(ids: readonly string[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/** Globe home — bridge invites + location confirms in one inbox. */
export function useGlobeInbox(enabled = true) {
  const { enabled: gpsEnabled } = useGpsTrackingEnabled();
  const bridge = usePendingBridgeInvites(enabled);
  const [dismissedLocationIds, setDismissedLocationIds] = useState<
    readonly string[]
  >(() => readDismissedLocationIds());
  const [locationRevision, setLocationRevision] = useState(0);

  useEffect(() => {
    const bump = () => setLocationRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  const locationConfirms = useMemo(
    () =>
      listPendingGlobeLocationConfirms({
        dismissedIds: dismissedLocationIds,
        gpsEnabled,
      }),
    [dismissedLocationIds, gpsEnabled, locationRevision],
  );

  const totalCount = bridge.invites.length + locationConfirms.length;

  const dismissLocationConfirm = useCallback((eventId: string) => {
    setDismissedLocationIds((prev) => {
      const key = eventId.trim();
      if (!key || prev.includes(key)) {
        return prev;
      }
      const next = [...prev, key];
      writeDismissedLocationIds(next);
      return next;
    });
  }, []);

  const refreshLocationConfirms = useCallback(() => {
    setLocationRevision((value) => value + 1);
  }, []);

  return {
    bridgeInvites: bridge.invites,
    locationConfirms,
    totalCount,
    loading: bridge.loading,
    bridgeError: bridge.error,
    needsLogin: bridge.needsLogin,
    refreshBridgeInvites: bridge.refresh,
    dismissBridgeInvite: bridge.dismissInvite,
    dismissLocationConfirm,
    refreshLocationConfirms,
    hasItems: totalCount > 0,
  };
}
