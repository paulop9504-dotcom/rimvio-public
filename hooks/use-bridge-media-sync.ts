"use client";

import { useCallback, useEffect, useRef } from "react";
import { syncAllBridgeSharedMedia } from "@/lib/experience-bridge/sync-all-bridge-shared-media";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const POLL_MS = 8_000;
const ACTIVE_POLL_MS = 4_000;

/** Background poll — friend/host bridge photos sync without app restart. */
export function useBridgeMediaSync(input?: {
  enabled?: boolean;
  /** Active map pin / open sheet — poll faster. */
  priorityEventId?: string | null;
}) {
  const enabled = input?.enabled ?? true;
  const priorityEventId = input?.priorityEventId?.trim() || null;
  const { user, configured } = useAuth();
  const remote = configured && isSupabaseConfigured() && Boolean(user?.id);
  const syncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (!enabled || !remote || syncingRef.current) {
      return 0;
    }
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return 0;
    }
    syncingRef.current = true;
    try {
      return await syncAllBridgeSharedMedia({
        viewerUserId: user?.id,
        priorityEventId,
      });
    } catch {
      return 0;
    } finally {
      syncingRef.current = false;
    }
  }, [enabled, priorityEventId, remote, user?.id]);

  useEffect(() => {
    if (!remote) {
      return;
    }
    void sync();
  }, [remote, sync]);

  useEffect(() => {
    if (!remote) {
      return;
    }
    let debounceTimer: number | null = null;
    const onRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void sync();
      }, 900);
    };
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);
    window.addEventListener(EXPERIENCE_BRIDGE_UPDATED, onRefresh);
    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
      window.removeEventListener(EXPERIENCE_BRIDGE_UPDATED, onRefresh);
    };
  }, [remote, sync]);

  useEffect(() => {
    if (!remote || typeof document === "undefined") {
      return;
    }

    let timer: ReturnType<typeof setInterval> | null = null;

    const arm = () => {
      if (timer != null) {
        window.clearInterval(timer);
        timer = null;
      }
      if (document.visibilityState === "hidden") {
        return;
      }
      const intervalMs = priorityEventId ? ACTIVE_POLL_MS : POLL_MS;
      timer = window.setInterval(() => void sync(), intervalMs);
    };

    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      if (timer != null) {
        window.clearInterval(timer);
      }
      document.removeEventListener("visibilitychange", arm);
    };
  }, [priorityEventId, remote, sync]);

  return { sync };
}
