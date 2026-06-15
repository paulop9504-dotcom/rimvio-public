"use client";

import { useEffect } from "react";
import {
  clearReminder,
  readDueReminders,
  readLinkReminders,
  showReminderNotification,
} from "@/lib/local-links/reminders";
import { pingReminderWorker, pushRemindersToServiceWorker } from "@/lib/pwa/reminder-bridge";

export function ReminderPoller() {
  useEffect(() => {
    void pushRemindersToServiceWorker(readLinkReminders());

    const tick = () => {
      void pingReminderWorker();
      const due = readDueReminders();

      for (const reminder of due) {
        showReminderNotification(reminder);
        clearReminder(reminder.id);
      }
    };

    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
