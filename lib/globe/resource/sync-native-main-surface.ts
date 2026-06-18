import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildMainNativeSurfaceCommand } from "@/lib/globe/resource/build-main-native-surface-payload";
import { readAppForeground } from "@/lib/globe/resource/build-api-wakeup-context";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import type { MainNativeSurfaceCommand } from "@/lib/globe/resource/main-native-surface";
import { isNativeShell, isIosShell } from "@/lib/native-bridge/rimvio-native-bridge";
import { RimvioMainSurface } from "@/lib/native-bridge/rimvio-main-surface";
import type { MainNativeSurfaceSyncResult } from "@/lib/native-bridge/rimvio-main-surface.types";

function resolveNativePlatform(): "android" | "ios" {
  return isIosShell() ? "ios" : "android";
}

export type SyncNativeMainSurfaceResult = MainNativeSurfaceSyncResult & {
  applied: boolean;
  revisionKey: string;
};

export function mainNativeSurfaceRevisionKey(input: {
  contextEventId: string;
  ranked: readonly RankedContextResource[];
}): string {
  const main = input.ranked[0];
  return [
    input.contextEventId,
    main?.resource.resourceId ?? "none",
    main?.resource.updatedAtIso ?? main?.resource.createdAtIso ?? "",
    main?.rankScore ?? 0,
  ].join("|");
}

/** Gate native sync — foreground uses web MAIN; background near gate uses OS surface. */
export function shouldDeferNativeMainSurfaceToWeb(
  command: MainNativeSurfaceCommand,
  foreground = readAppForeground(),
): boolean {
  if (!foreground) {
    return false;
  }
  return command.lifecycle !== "end" && command.payload != null;
}

/**
 * Hub rank revision → Capacitor RimvioMainSurface (Live Activity / ongoing notif).
 * @see docs/GLOBE_HUB_RESOURCE.md §8
 */
export async function syncNativeMainSurface(input: {
  ranked: readonly RankedContextResource[];
  event: EventCandidate;
  now?: Date;
  appForeground?: boolean;
}): Promise<SyncNativeMainSurfaceResult> {
  const revisionKey = mainNativeSurfaceRevisionKey({
    contextEventId: input.event.id,
    ranked: input.ranked,
  });

  if (!isNativeShell()) {
    return {
      applied: false,
      ok: false,
      platform: "web",
      revisionKey,
      note: "web_shell",
    };
  }

  const command = buildMainNativeSurfaceCommand({
    ranked: input.ranked,
    event: input.event,
    now: input.now,
  });

  const foreground = input.appForeground ?? readAppForeground();

  if (command.lifecycle === "end" || !command.payload) {
    const result = await RimvioMainSurface.endAllMainSurfaces();
    return {
      applied: true,
      ok: result.ok,
      platform: resolveNativePlatform(),
      lifecycle: "end",
      revisionKey,
      note: "native_surface_end",
    };
  }

  if (shouldDeferNativeMainSurfaceToWeb(command, foreground)) {
    return {
      applied: false,
      ok: false,
      platform: "web",
      lifecycle: command.lifecycle,
      revisionKey,
      note: "foreground_defer_to_web",
    };
  }

  const result = await RimvioMainSurface.syncMainSurface({ command });
  return {
    applied: result.ok,
    ...result,
    lifecycle: command.lifecycle,
    revisionKey,
  };
}
