"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { completeBridgeInviteAccept } from "@/lib/experience-bridge/complete-bridge-invite-accept";
import type {
  ExperienceBridgeState,
  ExperienceBridgeTimelineItem,
} from "@/lib/experience-bridge/experience-bridge-types";
import {
  acceptExperienceBridgeRemote,
  bootstrapExperienceBridgeRemote,
  declineExperienceBridgeRemote,
  fetchExperienceBridgeRemote,
  inviteExperienceBridgeRemote,
  leaveExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import {
  readLocalBridgeState,
  writeLocalBridgeState,
} from "@/lib/experience-bridge/local-bridge-store";
import { stampBridgeEventMetadata } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { toBridgeFetchError } from "@/lib/experience-bridge/bridge-fetch-error";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useExperienceBridge(input: {
  event: EventCandidate | null | undefined;
  peerThreadId?: string | null;
  enabled?: boolean;
}) {
  const enabled = input.enabled ?? true;
  const eventId = input.event?.id?.trim() ?? "";
  const { user, configured } = useAuth();
  const remote = configured && isSupabaseConfigured();

  const [state, setState] = useState<ExperienceBridgeState | null>(null);
  const [timeline, setTimeline] = useState<ExperienceBridgeTimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !eventId) {
      return;
    }
    setLoading(true);
    try {
      if (remote) {
        const data = await fetchExperienceBridgeRemote(eventId);
        setState(data.state);
        setTimeline(data.timeline);
        if (data.state) {
          writeLocalBridgeState(data.state);
        }
      } else {
        setState(readLocalBridgeState(eventId));
        setTimeline([]);
      }
      setError(null);
    } catch (caught) {
      if (remote) {
        const local = readLocalBridgeState(eventId);
        if (local) {
          setState(local);
          setTimeline([]);
          setError(null);
        } else {
          setError(toBridgeFetchError(caught) ?? "불러오지 못했어요.");
        }
      } else {
        setError(toBridgeFetchError(caught) ?? "불러오지 못했어요.");
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, eventId, remote]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let debounceTimer: number | null = null;
    const onUpdate = () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void refresh();
      }, 900);
    };
    window.addEventListener("rimvio-experience-bridge-updated", onUpdate);
    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      window.removeEventListener("rimvio-experience-bridge-updated", onUpdate);
    };
  }, [refresh]);

  const isHost = Boolean(
    user?.id && state?.bridge.hostUserId === user.id,
  );

  const bootstrap = useCallback(async () => {
    if (!input.event || !user?.id) {
      return null;
    }
    if (remote) {
      const data = await bootstrapExperienceBridgeRemote({
        event: input.event,
        peerThreadId: input.peerThreadId,
        hostDisplayName: user.email?.split("@")[0] ?? "나",
      });
      setState(data.state);
      writeLocalBridgeState(data.state);
      stampBridgeEventMetadata({
        event: input.event,
        bridge: data.state.bridge,
        role: "host",
      });
      return data.state;
    }
    return null;
  }, [input.event, input.peerThreadId, remote, user]);

  const invite = useCallback(
    async (participant: { userId: string; displayName: string }) => {
      if (!input.event || !eventId) {
        return null;
      }
      let current = state;
      if (!current) {
        current = await bootstrap();
      }
      if (!current) {
        return null;
      }
      const data = await inviteExperienceBridgeRemote({
        eventId,
        event: input.event,
        peerThreadId: input.peerThreadId,
        participantUserId: participant.userId,
        participantDisplayName: participant.displayName,
      });
      setState(data.state);
      writeLocalBridgeState(data.state);
      return data.state;
    },
    [bootstrap, eventId, input.event, input.peerThreadId, state],
  );

  const accept = useCallback(async () => {
    if (!eventId) {
      return null;
    }
    const data = await acceptExperienceBridgeRemote(eventId);
    await completeBridgeInviteAccept({
      state: data.state,
      peerThreadId: data.pinSpec.peerThreadId,
      viewerUserId: user?.id,
    });
    setState(data.state);
    await refresh();
    return data.state;
  }, [eventId, refresh, user?.id]);

  const decline = useCallback(async () => {
    if (!eventId) {
      return null;
    }
    const data = await declineExperienceBridgeRemote(eventId);
    setState(data.state);
    writeLocalBridgeState(data.state);
    return data.state;
  }, [eventId]);

  const leave = useCallback(async () => {
    if (!eventId) {
      return null;
    }
    const data = await leaveExperienceBridgeRemote(eventId);
    setState(data.state);
    writeLocalBridgeState(data.state);
    return data.state;
  }, [eventId]);

  return {
    state,
    timeline,
    loading,
    error,
    isHost,
    refresh,
    bootstrap,
    invite,
    accept,
    decline,
    leave,
  };
}
