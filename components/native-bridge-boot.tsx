"use client";

import { useEffect } from "react";
import { bootNativeNotificationBridge } from "@/lib/native-bridge/native-notification-bridge";
import { isNativeShell } from "@/lib/native-bridge/rimvio-native-bridge";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

/** Capacitor shell bootstrap — notification bridge + chrome. */
export function NativeBridgeBoot() {
  useEffect(() => {
    if (!isNativeShell()) {
      return;
    }

    void bootNativeNotificationBridge();

    void (async () => {
      try {
        await SplashScreen.hide();
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: "#0a0a0f" });
        }
      } catch {
        // optional native chrome
      }
    })();
  }, []);

  return null;
}
