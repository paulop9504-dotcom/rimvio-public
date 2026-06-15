"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPeerReadState,
  isRegisteredPeerDmThread,
  type GroupReadCursor,
} from "@/lib/peer-chat/peer-chat-client";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";

const POLL_MS = 8_000;

export function usePeerReadReceipt(threadId: string, enabled = true) {
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [groupReadCursors, setGroupReadCursors] = useState<GroupReadCursor[]>(
    [],
  );
  const trackRead = isRegisteredPeerDmThread(threadId) || isGroupThreadId(threadId);

  const refresh = useCallback(async () => {
    if (!enabled || !trackRead) {
      setPeerLastReadAt(null);
      setGroupReadCursors([]);
      return null;
    }
    try {
      const next = await fetchPeerReadState(threadId);
      setPeerLastReadAt(next.peerLastReadAt);
      setGroupReadCursors(next.groupReadCursors);
      return next;
    } catch {
      return null;
    }
  }, [threadId, enabled, trackRead]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !trackRead) {
      return;
    }
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, threadId, refresh, trackRead]);

  return {
    peerLastReadAt,
    setPeerLastReadAt,
    groupReadCursors,
    setGroupReadCursors,
    refreshPeerRead: refresh,
  };
}
