import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";
import {
  GPS_PINGS_UPDATED,
  appendGpsPing,
  listRecentGpsPings,
} from "@/lib/location-ping/gps-ping-store";
import {
  GPS_TRACKING_UPDATED,
  isGpsTrackingEnabled,
} from "@/lib/location-ping/gps-tracking-settings";
import {
  projectLiveLocationSnapshot,
  type LiveLocationSnapshot,
} from "@/lib/location-ping/project-live-location-snapshot";

export type LiveLocationPowerMode = "high" | "balanced" | "saver";

const LIVE_APPEND_MIN_MS = 45_000;
const SAVER_POLL_MS = 5 * 60_000;

type Listener = (snapshot: LiveLocationSnapshot | null) => void;

let listeners = new Set<Listener>();
let watchId: number | null = null;
let saverPollId: ReturnType<typeof setInterval> | null = null;
let powerMode: LiveLocationPowerMode = "high";
let snapshot: LiveLocationSnapshot | null = null;
let lastAppendMs = 0;
let started = false;

function formatTimeLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "지금";
  }
  return new Date(ms).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function geoOptions(mode: LiveLocationPowerMode): PositionOptions {
  if (mode === "high") {
    return { enableHighAccuracy: true, maximumAge: 4_000, timeout: 18_000 };
  }
  if (mode === "balanced") {
    return { enableHighAccuracy: false, maximumAge: 90_000, timeout: 22_000 };
  }
  return { enableHighAccuracy: false, maximumAge: 300_000, timeout: 30_000 };
}

function publish(input: {
  lat: number;
  lng: number;
  accuracyM: number | null;
  capturedAtIso: string;
}) {
  const next: LiveLocationSnapshot = {
    lat: input.lat,
    lng: input.lng,
    accuracyM: input.accuracyM,
    capturedAtIso: input.capturedAtIso,
    placeLabel: resolvePlaceLabelNearCoords(input.lat, input.lng),
    contextLabel: "현재 위치",
    timeLabel: formatTimeLabel(input.capturedAtIso),
  };
  snapshot = next;
  for (const listener of listeners) {
    listener(next);
  }
}

async function refreshFromStore() {
  if (!isGpsTrackingEnabled()) {
    snapshot = null;
    for (const listener of listeners) {
      listener(null);
    }
    return;
  }
  const next = projectLiveLocationSnapshot(await listRecentGpsPings());
  snapshot = next;
  for (const listener of listeners) {
    listener(next);
  }
}

function onPosition(position: GeolocationPosition) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracyM = position.coords.accuracy;
  const capturedAtIso = new Date(position.timestamp).toISOString();
  void listRecentGpsPings().then((pings) => {
    const context = projectLiveLocationSnapshot(pings, Date.now());
    const next: LiveLocationSnapshot = {
      lat,
      lng,
      accuracyM,
      capturedAtIso,
      placeLabel: resolvePlaceLabelNearCoords(lat, lng),
      contextLabel: context?.contextLabel ?? "현재 위치",
      timeLabel: formatTimeLabel(capturedAtIso),
    };
    snapshot = next;
    for (const listener of listeners) {
      listener(next);
    }
  });

  const now = Date.now();
  if (now - lastAppendMs >= LIVE_APPEND_MIN_MS) {
    lastAppendMs = now;
    void appendGpsPing({
      lat,
      lng,
      accuracyM,
      source: "foreground",
    });
  }
}

function pollOnce() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    void refreshFromStore();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    onPosition,
    () => {
      void refreshFromStore();
    },
    geoOptions("saver"),
  );
}

function stopWatch() {
  if (watchId != null && typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (saverPollId != null) {
    clearInterval(saverPollId);
    saverPollId = null;
  }
}

function startWatch() {
  stopWatch();
  if (!isGpsTrackingEnabled()) {
    snapshot = null;
    for (const listener of listeners) {
      listener(null);
    }
    return;
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    void refreshFromStore();
    return;
  }

  if (powerMode === "saver") {
    pollOnce();
    saverPollId = setInterval(pollOnce, SAVER_POLL_MS);
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    onPosition,
    () => {
      void refreshFromStore();
    },
    geoOptions(powerMode),
  );
}

function syncTracking() {
  startWatch();
}

function ensureStarted() {
  if (started) {
    return;
  }
  started = true;
  void refreshFromStore();
  syncTracking();
  window.addEventListener(GPS_TRACKING_UPDATED, syncTracking);
  window.addEventListener(GPS_PINGS_UPDATED, refreshFromStore);
}

export function getLiveLocationSnapshot(): LiveLocationSnapshot | null {
  return snapshot;
}

export function setLiveLocationPowerMode(mode: LiveLocationPowerMode) {
  if (powerMode === mode) {
    return;
  }
  powerMode = mode;
  if (started) {
    syncTracking();
  }
}

export function subscribeLiveLocation(listener: Listener): () => void {
  ensureStarted();
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopWatch();
      started = false;
      window.removeEventListener(GPS_TRACKING_UPDATED, syncTracking);
      window.removeEventListener(GPS_PINGS_UPDATED, refreshFromStore);
    }
  };
}

/** Test-only reset. */
export function resetLiveLocationServiceForTests(): void {
  stopWatch();
  listeners = new Set();
  snapshot = null;
  lastAppendMs = 0;
  powerMode = "high";
  started = false;
}
