import {
  pingServiceWorkerReminders,
  showServiceWorkerNotification,
  syncRemindersToServiceWorker,
} from "@/lib/pwa/service-worker";
import type { LinkReminder } from "@/lib/local-links/reminders";

export async function pushRemindersToServiceWorker(reminders: LinkReminder[]) {
  return syncRemindersToServiceWorker(reminders);
}

export async function notifyReminder(reminder: LinkReminder) {
  const viaWorker = await showServiceWorkerNotification(reminder);
  if (viaWorker) {
    return true;
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const notification = new Notification("Rimvio · 나중에 다시", {
    body: reminder.title,
    tag: reminder.id,
    data: { url: reminder.url },
  });

  notification.onclick = () => {
    window.focus();
    window.location.assign(reminder.url);
    notification.close();
  };

  return true;
}

export async function pingReminderWorker() {
  return pingServiceWorkerReminders();
}
