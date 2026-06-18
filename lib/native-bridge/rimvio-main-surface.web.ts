import { WebPlugin } from "@capacitor/core";
import type {
  RimvioMainSurfacePlugin,
  MainNativeSurfaceSyncResult,
} from "@/lib/native-bridge/rimvio-main-surface.types";

/** PWA — MAIN stays on web carousel; native OS surfaces are Capacitor-only. */
export class RimvioMainSurfaceWeb extends WebPlugin implements RimvioMainSurfacePlugin {
  async syncMainSurface(): Promise<MainNativeSurfaceSyncResult> {
    return {
      ok: false,
      platform: "web",
      note: "web_deferred_to_carousel",
    };
  }

  async endAllMainSurfaces(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async setScanBrightnessEnabled(): Promise<{ ok: boolean }> {
    return { ok: false };
  }
}
