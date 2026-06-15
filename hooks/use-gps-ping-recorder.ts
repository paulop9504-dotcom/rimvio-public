"use client";

import { useEffect, useRef } from "react";
import {
  GPS_PING_INTERVAL_DWELL_MS,
  GPS_PING_INTERVAL_MS,
} from "@/lib/location-ping/constants";
import {
  GPS_PINGS_UPDATED,
  appendGpsPing,
  hydrateGpsPingStore,
  listRecentGpsPings,
} from "@/lib/location-ping/gps-ping-store";

function sampleGpsPing(source: "periodic" | "foreground", highAccuracy: boolean) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      void appendGpsPing({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyM: position.coords.accuracy,
        source,
      });
    },
    () => {},
    {
      enableHighAccuracy: highAccuracy,
      maximumAge: highAccuracy ? 8_000 : 120_000,
      timeout: highAccuracy ? 18_000 : 25_000,
    },
  );
}

async function resolvePingIntervalMs(): Promise<number> {
  const pings = await listRecentGpsPings();
  if (pings.length < 3) {
    return GPS_PING_INTERVAL_MS;
  }
  const recent = pings.slice(-3);
  const centerLat = recent.reduce((sum, row) => sum + row.lat, 0) / recent.length;
  const centerLng = recent.reduce((sum, row) => sum + row.lng, 0) / recent.length;
  const dwelling = recent.every((row) => {
    const dLat = ((row.lat - centerLat) * Math.PI) / 180;
    const dLng = ((row.lng - centerLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((centerLat * Math.PI) / 180) *
        Math.cos((row.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 0.35;
  });
  return dwelling ? GPS_PING_INTERVAL_DWELL_MS : GPS_PING_INTERVAL_MS;
}

/** Background GPS ring buffer — slower while dwelling, low accuracy when idle. */
export function useGpsPingRecorder(enabled = true) {
  const intervalMsRef = useRef(GPS_PING_INTERVAL_MS);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const runPeriodic = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      const intervalMs = await resolvePingIntervalMs();
      intervalMsRef.current = intervalMs;
      sampleGpsPing("periodic", intervalMs <= GPS_PING_INTERVAL_MS);
    };

    const rearm = async () => {
      const intervalMs = await resolvePingIntervalMs();
      if (cancelled) {
        return;
      }
      intervalMsRef.current = intervalMs;
      if (intervalIdRef.current != null) {
        clearInterval(intervalIdRef.current);
      }
      intervalIdRef.current = window.setInterval(() => {
        void runPeriodic();
      }, intervalMs);
    };

    void hydrateGpsPingStore().then(() => {
      sampleGpsPing("foreground", true);
      void rearm();
    });

    const onPingsUpdated = () => {
      void rearm();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        sampleGpsPing("foreground", true);
      }
    };

    window.addEventListener(GPS_PINGS_UPDATED, onPingsUpdated);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (intervalIdRef.current != null) {
        clearInterval(intervalIdRef.current);
      }
      window.removeEventListener(GPS_PINGS_UPDATED, onPingsUpdated);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
