"use client";

import { App } from "@capacitor/app";
import { useCallback, useEffect, useRef } from "react";
import { runAlbumSync } from "@/lib/ingest/run-album-sync";
import { scanRecentMediaContexts } from "@/lib/ingest/scan-recent-media-contexts";
import {
  isAndroidShell,
  isNativeShell,
  RimvioNativeBridge,
} from "@/lib/native-bridge/rimvio-native-bridge";
import {
  ALBUM_SYNC_UPDATED,
  readAlbumSyncPrefs,
} from "@/lib/preferences/album-sync";
import { MEDIA_SPACETIME_UPDATED } from "@/lib/location-ping/media-context-store";

const BOOT_DELAY_MS = 8_000;
const INTERVAL_MS = 30 * 60 * 1000;
const RESUME_DEBOUNCE_MS = 2_500;

export function useAlbumSync(input?: { enabled?: boolean }) {
  const enabled = input?.enabled ?? true;
  const runningRef = useRef(false);

  const evaluate = useCallback(async (force = false) => {
    if (!enabled || runningRef.current) {
      return null;
    }

    const prefs = readAlbumSyncPrefs();
    if (!prefs.enabled && !force) {
      return null;
    }

    runningRef.current = true;
    try {
      const result = await runAlbumSync({ force });
      if (result.status === "done" && (result.imported > 0 || result.scanned > 0)) {
        await scanRecentMediaContexts();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(MEDIA_SPACETIME_UPDATED));
        }
      }
      return result;
    } finally {
      runningRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const bootTimer = setTimeout(() => {
      void evaluate();
      interval = setInterval(() => {
        void evaluate();
      }, INTERVAL_MS);
    }, BOOT_DELAY_MS);

    const onPrefs = () => {
      void evaluate();
    };
    window.addEventListener(ALBUM_SYNC_UPDATED, onPrefs);

    const scheduleResume = () => {
      const prefs = readAlbumSyncPrefs();
      if (!prefs.enabled || !prefs.resumeOnOpen) {
        return;
      }
      if (resumeTimer) {
        clearTimeout(resumeTimer);
      }
      resumeTimer = setTimeout(() => {
        void evaluate();
      }, RESUME_DEBOUNCE_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleResume();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    let appListener: { remove: () => Promise<void> } | null = null;
    let photoListener: { remove: () => Promise<void> } | null = null;
    if (isNativeShell()) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          scheduleResume();
        }
      }).then((handle) => {
        appListener = handle;
      });
    }
    if (isAndroidShell()) {
      void RimvioNativeBridge.addListener("photoLibraryChanged", () => {
        scheduleResume();
      }).then((handle) => {
        photoListener = handle;
      });
    }

    return () => {
      clearTimeout(bootTimer);
      if (interval) {
        clearInterval(interval);
      }
      if (resumeTimer) {
        clearTimeout(resumeTimer);
      }
      window.removeEventListener(ALBUM_SYNC_UPDATED, onPrefs);
      document.removeEventListener("visibilitychange", onVisibility);
      void appListener?.remove();
      void photoListener?.remove();
    };
  }, [enabled, evaluate]);

  return { syncNow: () => evaluate(true) };
}
