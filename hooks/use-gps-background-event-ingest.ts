"use client";

import { useEffect, useRef } from "react";
import { detectGpsDwellClusters } from "@/lib/location-ping/detect-gps-dwell-clusters";
import {
  GPS_PINGS_UPDATED,
  listRecentGpsPings,
} from "@/lib/location-ping/gps-ping-store";
import { ingestGpsDwellClusters } from "@/lib/feed/ingest-gps-dwell-to-feed";

const PROCESS_DEBOUNCE_MS = 2_500;

/** Closed GPS dwell clusters → Feed Events while the app is open. */
export function useGpsBackgroundEventIngest(enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const process = async () => {
      if (processingRef.current) {
        return;
      }
      processingRef.current = true;
      try {
        const pings = await listRecentGpsPings();
        const clusters = detectGpsDwellClusters(pings);
        ingestGpsDwellClusters(clusters);
      } finally {
        processingRef.current = false;
      }
    };

    const schedule = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        void process();
      }, PROCESS_DEBOUNCE_MS);
    };

    schedule();
    window.addEventListener(GPS_PINGS_UPDATED, schedule);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener(GPS_PINGS_UPDATED, schedule);
    };
  }, [enabled]);
}
