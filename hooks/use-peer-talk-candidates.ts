"use client";

import { useEffect, useMemo, useState } from "react";
import { parseActivePeerTalkComposer } from "@/lib/peer-chat/active-peer-talk-composer";
import { filterPeerContactsForTalk } from "@/lib/peer-chat/filter-talk-contacts";
import { hydrateTalkContactSearch } from "@/lib/peer-chat/hydrate-talk-contact-search";

/** 피드 입력 @톡 — 실시간 버블 후보 + 프로필 메타 보강 */
export function usePeerTalkCandidates(composerText: string) {
  const active = useMemo(
    () => parseActivePeerTalkComposer(composerText),
    [composerText],
  );
  const [hydrated, setHydrated] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }
    let cancelled = false;
    void hydrateTalkContactSearch().then(() => {
      if (!cancelled) {
        setHydrated((n) => n + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const candidates = useMemo(() => {
    if (!active) {
      return [];
    }
    return filterPeerContactsForTalk(active.query);
  }, [active, hydrated]);

  return { active, candidates };
}
