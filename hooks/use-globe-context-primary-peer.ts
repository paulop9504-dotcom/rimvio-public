"use client";

import { useEffect, useMemo, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readGlobePinPeerSeedsFromEvent } from "@/lib/globe/project-globe-pin-peers";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";

/** Primary peer label on a globe context event. */
export function useGlobeContextPrimaryPeer(
  eventId: string | null | undefined,
): string | null {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    refresh();
    window.addEventListener(EVENT_CANDIDATES_UPDATED, refresh);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, refresh);
  }, []);

  return useMemo(() => {
    void revision;
    const key = eventId?.trim();
    if (!key) {
      return null;
    }
    const event: EventCandidate | null = findLifeEventCandidate(key);
    const seed = readGlobePinPeerSeedsFromEvent(event)[0];
    return seed?.displayName?.trim() || null;
  }, [eventId, revision]);
}
