import { Capacitor, registerPlugin } from "@capacitor/core";
import type { RimvioNativeBridgePlugin } from "@/lib/native-bridge/rimvio-native-bridge.types";

export const RimvioNativeBridge = registerPlugin<RimvioNativeBridgePlugin>(
  "RimvioNativeBridge",
  {
    web: () =>
      import("@/lib/native-bridge/rimvio-native-bridge.web").then(
        (module) => new module.RimvioNativeBridgeWeb(),
      ),
  },
);

export function isNativeShell(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroidShell(): boolean {
  return Capacitor.getPlatform() === "android";
}

export function isIosShell(): boolean {
  return Capacitor.getPlatform() === "ios";
}
