"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDmPeerPublicProfile,
  isRegisteredPeerDmThread,
  type PeerPublicProfile,
} from "@/lib/peer-chat/peer-chat-client";

export function useDmPeerProfile(threadId: string | null, enabled = true) {
  const [profile, setProfile] = useState<PeerPublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!threadId || !enabled || !isRegisteredPeerDmThread(threadId)) {
      setProfile(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchDmPeerPublicProfile(threadId);
      setProfile(next);
      return next;
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : "프로필을 불러오지 못했어요");
      return null;
    } finally {
      setLoading(false);
    }
  }, [threadId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const label =
    profile?.displayName?.trim() ||
    profile?.rimvioId ||
    null;

  return { profile, loading, error, reload, label };
}
