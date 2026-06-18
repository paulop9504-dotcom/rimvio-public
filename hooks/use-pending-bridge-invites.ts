"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ExperienceBridgeParticipant,
  ExperienceBridgeState,
} from "@/lib/experience-bridge/experience-bridge-types";
import { fetchPendingBridgeInvitesRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { toBridgeFetchError } from "@/lib/experience-bridge/bridge-fetch-error";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type PendingBridgeInvite = {
  state: ExperienceBridgeState;
  invite: ExperienceBridgeParticipant;
};

const POLL_MS = 12_000;

export function usePendingBridgeInvites(enabled = true) {
  const { user, configured } = useAuth();
  const remote = configured && isSupabaseConfigured() && Boolean(user?.id);

  const [invites, setInvites] = useState<PendingBridgeInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !remote) {
      setInvites([]);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPendingBridgeInvitesRemote();
      setInvites(data.invites ?? []);
      setError(null);
    } catch (caught) {
      setInvites((current) => {
        const friendly = toBridgeFetchError(caught);
        setError(current.length > 0 || !friendly ? null : friendly);
        return current;
      });
    } finally {
      setLoading(false);
    }
  }, [enabled, remote]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
        void refresh();
      }, 900);
    };
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);
    window.addEventListener(EXPERIENCE_BRIDGE_UPDATED, onRefresh);
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
      window.removeEventListener(EXPERIENCE_BRIDGE_UPDATED, onRefresh);
      window.clearInterval(timer);
    };
  }, [remote, refresh]);

  const dismissInvite = useCallback((eventId: string) => {
    setInvites((rows) => rows.filter((row) => row.state.bridge.eventId !== eventId));
  }, []);

  return {
    invites,
    loading,
    error,
    refresh,
    dismissInvite,
    hasInvites: invites.length > 0,
    needsLogin: enabled && configured && isSupabaseConfigured() && !user?.id,
  };
}
