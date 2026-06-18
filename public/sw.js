/* Rimvio service worker — push + background reminders (prep for production push). */

const REMINDER_CACHE = "rimvio-reminders-v1";
const REMINDER_JSON_KEY = "/reminders.json";
const CHECK_MS = 30_000;

let checkTimer = null;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await startReminderLoop();
    })()
  );
});

async function readReminders() {
  const cache = await caches.open(REMINDER_CACHE);
  const response = await cache.match(REMINDER_JSON_KEY);
  if (!response) {
    return [];
  }

  try {
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeReminders(reminders) {
  const cache = await caches.open(REMINDER_CACHE);
  await cache.put(
    REMINDER_JSON_KEY,
    new Response(JSON.stringify(reminders), {
      headers: { "Content-Type": "application/json" },
    })
  );
}

async function showRimvioNotification(reminder) {
  const title = "Rimvio · 나중에 다시";
  const body = reminder.title || "저장한 링크";
  const url = reminder.url || "/";

  await self.registration.showNotification(title, {
    body,
    tag: reminder.id,
    data: { url },
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    renotify: true,
  });
}

async function checkDueReminders() {
  const now = Date.now();
  const reminders = await readReminders();
  const due = reminders.filter(
    (item) => new Date(item.fireAt).getTime() <= now
  );

  if (due.length === 0) {
    return;
  }

  const remaining = reminders.filter(
    (item) => new Date(item.fireAt).getTime() > now
  );

  await writeReminders(remaining);

  for (const reminder of due) {
    await showRimvioNotification(reminder);
  }
}

async function startReminderLoop() {
  await checkDueReminders();

  if (checkTimer) {
    clearInterval(checkTimer);
  }

  checkTimer = setInterval(() => {
    void checkDueReminders();
  }, CHECK_MS);
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }

  if (data.type === "SYNC_REMINDERS" && Array.isArray(data.reminders)) {
    void (async () => {
      await writeReminders(data.reminders);
      await startReminderLoop();
    })();
    return;
  }

  if (data.type === "CHECK_REMINDERS") {
    void checkDueReminders();
    return;
  }

  if (data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = {
        title: "Rimvio",
        body: "저장한 링크를 다시 확인해 보세요",
        url: "/",
      };

      if (event.data) {
        try {
          payload = { ...payload, ...event.data.json() };
        } catch {
          payload.body = event.data.text() || payload.body;
        }
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: payload.url },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(url);
          }
          return;
        }
      }

      await self.clients.openWindow(url);
    })()
  );
});
