import type { MainNativeSurfaceCommand } from "@/lib/globe/resource/main-native-surface";

export type MainNativeSurfaceSyncResult = {
  ok: boolean;
  platform: "android" | "ios" | "web";
  lifecycle?: MainNativeSurfaceCommand["lifecycle"];
  note?: string;
};

export interface RimvioMainSurfacePlugin {
  syncMainSurface(options: {
    command: MainNativeSurfaceCommand;
  }): Promise<MainNativeSurfaceSyncResult>;
  endAllMainSurfaces(): Promise<{ ok: boolean }>;
  /** Foreground QR viewer — OS brightness boost (Capacitor shell only). */
  setScanBrightnessEnabled(options: {
    enabled: boolean;
  }): Promise<{ ok: boolean }>;
}
