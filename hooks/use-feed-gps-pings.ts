"use client";

import { useEffect, useState } from "react";
import {
  GPS_PINGS_UPDATED,
  listRecentGpsPings,
} from "@/lib/location-ping/gps-ping-store";
import type { GpsPing } from "@/lib/location-ping/types";

/** Lightweight GPS snapshot for Feed timeline dwell projection. */
export function useFeedGpsPings(): readonly GpsPing[] {
  const [pings, setPings] = useState<readonly GpsPing[]>([]);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void listRecentGpsPings().then((rows) => {
        if (!cancelled) {
          setPings(rows);
        }
      });
    };
    refresh();
    window.addEventListener(GPS_PINGS_UPDATED, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(GPS_PINGS_UPDATED, refresh);
    };
  }, []);

  return pings;
}
