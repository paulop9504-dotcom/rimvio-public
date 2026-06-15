"use client";

import { useCallback, useState } from "react";
import { syncGoogleCalendarToEventStore } from "@/lib/google-calendar/client-sync";

export function useGoogleCalendarSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const count = await syncGoogleCalendarToEventStore();
      setLastSynced(count);
      return count;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { sync, syncing, lastSynced };
}
