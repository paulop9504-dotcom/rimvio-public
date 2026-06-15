"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GPS_TRACKING_UPDATED,
  isGpsTrackingEnabled,
  setGpsTrackingEnabled,
} from "@/lib/location-ping/gps-tracking-settings";

export function useGpsTrackingEnabled() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const refresh = () => setEnabled(isGpsTrackingEnabled());
    refresh();
    window.addEventListener(GPS_TRACKING_UPDATED, refresh);
    return () => window.removeEventListener(GPS_TRACKING_UPDATED, refresh);
  }, []);

  const toggle = useCallback((next: boolean) => {
    setGpsTrackingEnabled(next);
    setEnabled(next);
  }, []);

  return { enabled, setEnabled: toggle };
}
