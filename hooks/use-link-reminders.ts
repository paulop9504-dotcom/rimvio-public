"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LINK_REMINDERS_UPDATED, readLinkReminders } from "@/lib/local-links/reminders";
import type { LinkReminder } from "@/lib/local-links/reminders";

export function useLinkReminders() {
  const [reminders, setReminders] = useState<LinkReminder[]>([]);

  const refresh = useCallback(() => {
    setReminders(readLinkReminders());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(LINK_REMINDERS_UPDATED, refresh);
    return () => window.removeEventListener(LINK_REMINDERS_UPDATED, refresh);
  }, [refresh]);

  return { reminders, refresh };
}

export function useLinkReminderMap() {
  const { reminders } = useLinkReminders();
  return useMemo(
    () => new Map(reminders.map((reminder) => [reminder.linkId, reminder])),
    [reminders]
  );
}
