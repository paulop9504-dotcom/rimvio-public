"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  alignGlobeContextPlaces,
  type AlignGlobeContextPlacesResult,
} from "@/lib/globe/align-globe-context-places";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const INITIAL_DELAY_MS = 2_500;
/** ~150m — ignore GPS jitter; avoids N× place-candidates per tick. */
const MIN_MOVE_METERS = 150;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

export function useGlobeContextPlaceAlignment(input: {
  enabled?: boolean;
  intervalMs?: number;
  userLat?: number | null;
  userLng?: number | null;
  onAligned?: (result: AlignGlobeContextPlacesResult) => void;
}) {
  const runningRef = useRef(false);
  const onAlignedRef = useRef(input.onAligned);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastAlignedRef = useRef<{ lat: number; lng: number } | null>(null);

  onAlignedRef.current = input.onAligned;

  const run = useCallback(async () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    try {
      const result = await alignGlobeContextPlaces({
        userLat: coordsRef.current?.lat ?? input.userLat,
        userLng: coordsRef.current?.lng ?? input.userLng,
      });
      if (coordsRef.current) {
        lastAlignedRef.current = { ...coordsRef.current };
      }
      onAlignedRef.current?.(result);
    } finally {
      runningRef.current = false;
    }
  }, [input.userLat, input.userLng]);

  useEffect(() => {
    const lat = input.userLat;
    const lng = input.userLng;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const prev = coordsRef.current;
    coordsRef.current = { lat, lng };

    if (prev) {
      const moved = haversineMeters(prev.lat, prev.lng, lat, lng);
      if (moved < MIN_MOVE_METERS) {
        return;
      }
    }

    const last = lastAlignedRef.current;
    if (last) {
      const sinceAlign = haversineMeters(last.lat, last.lng, lat, lng);
      if (sinceAlign < MIN_MOVE_METERS) {
        return;
      }
    }
  }, [input.userLat, input.userLng]);

  useEffect(() => {
    if (input.enabled === false) {
      return;
    }

    const initialTimer = window.setTimeout(() => {
      void run();
    }, INITIAL_DELAY_MS);

    const interval = window.setInterval(() => {
      void run();
    }, input.intervalMs ?? DEFAULT_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [input.enabled, input.intervalMs, run]);
}
