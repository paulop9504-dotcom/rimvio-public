"use client";

import { useEffect } from "react";
import { useGlobeExperienceSettings } from "@/hooks/use-globe-experience-settings";
import { useGpsBackgroundEventIngest } from "@/hooks/use-gps-background-event-ingest";
import { useGpsPingRecorder } from "@/hooks/use-gps-ping-recorder";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { hydrateGpsPingStore } from "@/lib/location-ping/gps-ping-store";
import { hydrateMediaContextStore } from "@/lib/location-ping/media-context-store";

/** Starts periodic GPS pings and hydrates local spacetime stores. */
export function GpsPingBootstrap() {
  const { enabled } = useGpsTrackingEnabled();
  const { settings } = useGlobeExperienceSettings();
  useGpsPingRecorder(enabled);
  useGpsBackgroundEventIngest(enabled && settings.gpsDwellIngest);

  useEffect(() => {
    void hydrateGpsPingStore();
    void hydrateMediaContextStore();
  }, []);

  return null;
}
