"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deriveTodayAxisCards,
  type TodayAxisCard,
} from "@/lib/home/derive-today-axis";
import { countPendingInboxItems, HOME_INBOX_UPDATED } from "@/lib/home/inbox-store";

const CONTAINER_EVENTS_KEY = "rimvio.container-events.v1";
const CONTAINERS_KEY = "rimvio.containers.v1";

export function useHomeAxis() {
  const [todayCards, setTodayCards] = useState<TodayAxisCard[]>([]);
  const [inboxCount, setInboxCount] = useState(0);

  const refresh = useCallback(() => {
    setTodayCards(deriveTodayAxisCards());
    setInboxCount(countPendingInboxItems());
  }, []);

  useEffect(() => {
    refresh();

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === CONTAINER_EVENTS_KEY ||
        event.key === CONTAINERS_KEY ||
        event.key === "rimvio.home-inbox.v1"
      ) {
        refresh();
      }
    };

    const onInbox = () => refresh();

    window.addEventListener("storage", onStorage);
    window.addEventListener(HOME_INBOX_UPDATED, onInbox);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(HOME_INBOX_UPDATED, onInbox);
    };
  }, [refresh]);

  return { todayCards, inboxCount, refresh };
}
