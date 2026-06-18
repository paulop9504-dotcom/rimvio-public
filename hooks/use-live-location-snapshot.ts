"use client";

import { useEffect, useState } from "react";
import {
  getLiveLocationSnapshot,
  subscribeLiveLocation,
} from "@/lib/location-ping/live-location-service";
import type { LiveLocationSnapshot } from "@/lib/location-ping/project-live-location-snapshot";

/** Shared GPS watch — one geolocation subscription for the whole app. */
export function useLiveLocationSnapshot(): LiveLocationSnapshot | null {
  const [snapshot, setSnapshot] = useState<LiveLocationSnapshot | null>(() =>
    getLiveLocationSnapshot(),
  );

  useEffect(() => subscribeLiveLocation(setSnapshot), []);

  return snapshot;
}
