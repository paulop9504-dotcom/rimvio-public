"use client";

import { useEffect, useMemo, useState } from "react";
import { parseActiveGroupTalkComposer } from "@/lib/peer-chat/active-group-talk-composer";
import { filterGroupsForTalk } from "@/lib/peer-chat/filter-groups-for-talk";
import { syncDmThreadsRemote } from "@/lib/peer-chat/peer-chat-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** 피드 입력 @단톡 — 단톡 ROOM 버블 후보 */
export function useGroupTalkCandidates(composerText: string) {
  const active = useMemo(
    () => parseActiveGroupTalkComposer(composerText),
    [composerText],
  );
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!active || !isSupabaseConfigured()) {
      return;
    }
    let cancelled = false;
    void syncDmThreadsRemote()
      .then(() => {
        if (!cancelled) {
          setRevision((n) => n + 1);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active]);

  const candidates = useMemo(() => {
    if (!active) {
      return [];
    }
    return filterGroupsForTalk(active.query);
  }, [active, revision]);

  return { active, candidates };
}
