"use client";

import { useEffect } from "react";
import {
  refreshRimvioServiceWorker,
  registerRimvioServiceWorker,
  subscribeWebPush,
} from "@/lib/pwa/service-worker";
import { isStandalonePwa } from "@/lib/platform/device";

/** Registers SW on boot; refreshes on focus for PWA deploy updates. */
export function ServiceWorkerBootstrap() {
  useEffect(() => {
    let reloaded = false;

    const onControllerChange = () => {
      if (reloaded) {
        return;
      }
      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    void (async () => {
      const registration = await registerRimvioServiceWorker();
      if (!registration) {
        return;
      }

      if (isStandalonePwa() && typeof Notification !== "undefined") {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      }

      await subscribeWebPush();
    })();

    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refreshRimvioServiceWorker();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
