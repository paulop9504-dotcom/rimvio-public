"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";
import { sharedGlobePinFromMessageRow } from "@/lib/peer-chat/project-thread-globe-pins";
import { fetchSharedGlobePinsRemote } from "@/lib/peer-chat/peer-chat-client";
import type { PeerMessageRow } from "@/lib/peer-chat/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tryCreateClient } from "@/lib/supabase/client";

const POLL_FALLBACK_MS = 30_000;
const PEER_MESSAGES_TABLE = "peer_messages";

export function useSharedGlobePins(input: {
  peerThreadId: string;
  enabled?: boolean;
}) {
  const enabled = input.enabled ?? true;
  const { user, configured } = useAuth();
  const supabase = useMemo(
    () => (configured && isSupabaseConfigured() ? tryCreateClient() : null),
    [configured],
  );
  const useRealtime = Boolean(enabled && supabase && user);

  const [pins, setPins] = useState<SharedGlobePin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedThreadId, setResolvedThreadId] = useState(input.peerThreadId);

  const refresh = useCallback(async () => {
    if (!enabled || !input.peerThreadId.trim()) {
      return;
    }
    setLoading(true);
    try {
      const data = await fetchSharedGlobePinsRemote(input.peerThreadId);
      setPins(data.pins);
      setResolvedThreadId(data.threadId);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "핀을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [enabled, input.peerThreadId]);

  const upsertPin = useCallback((pin: SharedGlobePin) => {
    setPins((current) => {
      const next = current.filter((row) => row.messageId !== pin.messageId);
      return [...next, pin].sort(
        (left, right) =>
          new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime(),
      );
    });
  }, []);

  const removePin = useCallback((messageId: string) => {
    setPins((current) => current.filter((row) => row.messageId !== messageId));
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || useRealtime) {
      return;
    }
    const id = window.setInterval(() => {
      void refresh();
    }, POLL_FALLBACK_MS);
    return () => window.clearInterval(id);
  }, [enabled, refresh, useRealtime]);

  useEffect(() => {
    if (!useRealtime || !resolvedThreadId.trim()) {
      return;
    }

    const channel = supabase!
      .channel(`shared-globe:${resolvedThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: PEER_MESSAGES_TABLE,
          filter: `thread_id=eq.${resolvedThreadId}`,
        },
        (payload) => {
          const row = (payload as RealtimePostgresChangesPayload<PeerMessageRow>)
            .new as PeerMessageRow | undefined;
          if (!row?.id) {
            return;
          }
          const pin = sharedGlobePinFromMessageRow(row);
          if (pin) {
            upsertPin(pin);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: PEER_MESSAGES_TABLE,
          filter: `thread_id=eq.${resolvedThreadId}`,
        },
        (payload) => {
          const row = (payload as RealtimePostgresChangesPayload<PeerMessageRow>)
            .new as PeerMessageRow | undefined;
          if (!row?.id) {
            return;
          }
          const pin = sharedGlobePinFromMessageRow(row);
          if (pin) {
            upsertPin(pin);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: PEER_MESSAGES_TABLE,
          filter: `thread_id=eq.${resolvedThreadId}`,
        },
        (payload) => {
          const row = (payload as RealtimePostgresChangesPayload<PeerMessageRow>)
            .old as PeerMessageRow | undefined;
          if (row?.id) {
            removePin(row.id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase!.removeChannel(channel);
    };
  }, [useRealtime, supabase, resolvedThreadId, upsertPin, removePin]);

  return {
    pins,
    loading,
    error,
    resolvedThreadId,
    refresh,
    upsertPin,
    removePin,
  };
}
