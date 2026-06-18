/**
 * Native MAIN surface — L3 contract for Capacitor / Live Activity / Dynamic Island.
 * @see docs/GLOBE_HUB_RESOURCE.md §8
 *
 * Web carousel index 0 and native OS surfaces share this payload SSOT.
 * Hub does not emit this — ranking engine output (MAIN only) does.
 */

import type {
  ContextResource,
  ContextResourceActionKind,
  ContextResourceKind,
} from "@/lib/globe/resource/types";

/** Bump when native bridge fields change — ActivityKit / Android ongoing notif must match. */
export const MAIN_NATIVE_SURFACE_CONTRACT_VERSION = 1 as const;

export type MainNativeSurfacePlatform = "ios_live_activity" | "android_ongoing";

/** iOS Dynamic Island presentation modes (ActivityKit). */
export type MainNativeSurfacePresentation = "compact" | "minimal" | "expanded";

export type MainNativeSurfacePayload = {
  contractVersion: typeof MAIN_NATIVE_SURFACE_CONTRACT_VERSION;
  /** Stable id for Activity / notification tag — `${contextEventId}:${sourceHubId}` */
  surfaceId: string;
  resourceId: string;
  contextEventId: string;
  contextTitle: string;
  contextPlace: string | null;
  kind: ContextResourceKind;
  labelKo: string;
  shortLabelKo: string | null;
  actionKind: ContextResourceActionKind;
  /** QR/barcode image — data URL or https png/jpeg. Native renders in SwiftUI / notification. */
  qrImageSrc: string | null;
  /** Fallback when no QR image (ticket URL, internal route). */
  actionHref: string | null;
  validFromIso: string | null;
  validUntilIso: string | null;
  placeLabel: string | null;
  /** L1 — e.g. 「지금」; never 「Live Activity」「Dynamic Island」 */
  eyebrowKo: string;
  ctaLabelKo: string;
  /** Native may boost brightness while expanded QR is visible. */
  preferScanBrightness: boolean;
  platforms: readonly MainNativeSurfacePlatform[];
};

export type MainNativeSurfaceLifecycle =
  | "start"
  | "update"
  | "end";

export type MainNativeSurfaceCommand = {
  lifecycle: MainNativeSurfaceLifecycle;
  payload: MainNativeSurfacePayload | null;
  atIso: string;
};

/** Capacitor plugin method names — implement in Swift / Java when native phase ships. */
export const MAIN_NATIVE_SURFACE_PLUGIN = "RimvioMainSurface" as const;

export const MAIN_NATIVE_SURFACE_PLUGIN_METHODS = {
  sync: "syncMainSurface",
  endAll: "endAllMainSurfaces",
  setScanBrightness: "setScanBrightnessEnabled",
} as const;

export function isMainNativeSurfaceEligible(resource: ContextResource): boolean {
  if (!resource.action) {
    return false;
  }
  if (resource.action.kind === "show_qr") {
    return true;
  }
  if (resource.kind === "ticket" && resource.action.kind === "open_url") {
    return true;
  }
  return false;
}
