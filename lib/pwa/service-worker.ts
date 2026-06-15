import type { LinkReminder } from "@/lib/local-links/reminders";

export const SERVICE_WORKER_PATH = "/sw.js";

export function isServiceWorkerSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

export async function registerRimvioServiceWorker() {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
      scope: "/",
      updateViaCache: "none",
    });
  } catch {
    return null;
  }
}

/** PWA — check for a new sw.js and reload once it takes control. */
export async function refreshRimvioServiceWorker() {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      return false;
    }

    await registration.update();

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    return true;
  } catch {
    return false;
  }
}

export async function getServiceWorkerRegistration() {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function syncRemindersToServiceWorker(reminders: LinkReminder[]) {
  const registration = await getServiceWorkerRegistration();
  const worker = registration?.active ?? registration?.waiting ?? registration?.installing;

  if (!worker) {
    return false;
  }

  worker.postMessage({
    type: "SYNC_REMINDERS",
    reminders,
  });

  return true;
}

export async function pingServiceWorkerReminders() {
  const registration = await getServiceWorkerRegistration();
  const worker = registration?.active;

  if (!worker) {
    return false;
  }

  worker.postMessage({ type: "CHECK_REMINDERS" });
  return true;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

export function hasWebPushPublicKey() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim());
}

export async function subscribeWebPush() {
  if (!hasWebPushPublicKey() || !isServiceWorkerSupported() || !("PushManager" in window)) {
    return null;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });

  try {
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
  } catch {
    // Server store is optional until VAPID private key is configured.
  }

  return subscription;
}

export async function showServiceWorkerNotification(reminder: LinkReminder) {
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return false;
  }

  await registration.showNotification("Rimvio · 나중에 다시", {
    body: reminder.title,
    tag: reminder.id,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: reminder.url },
  });

  return true;
}
