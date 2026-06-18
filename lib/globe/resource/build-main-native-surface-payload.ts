import type { EventCandidate } from "@/lib/events/event-candidate";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import {
  isMainNativeSurfaceEligible,
  MAIN_NATIVE_SURFACE_CONTRACT_VERSION,
  type MainNativeSurfacePayload,
} from "@/lib/globe/resource/main-native-surface";
import type { ContextResource } from "@/lib/globe/resource/types";
import { isTicketQrViewerHref } from "@/lib/globe/ticket-scan-surface";

const MAIN_SURFACE_LEAD_MS = 45 * 60 * 1000;
const MAIN_SURFACE_TAIL_MS = 20 * 60 * 1000;

function readQrImageSrc(resource: ContextResource): string | null {
  const fromMeta =
    typeof resource.metadata?.qrPreviewUrl === "string"
      ? resource.metadata.qrPreviewUrl.trim()
      : "";
  if (fromMeta && isTicketQrViewerHref(fromMeta)) {
    return fromMeta;
  }
  if (resource.action?.kind === "show_qr" && isTicketQrViewerHref(resource.action.href)) {
    return resource.action.href;
  }
  return null;
}

function isWithinNativeSurfaceWindow(input: {
  resource: ContextResource;
  now: Date;
}): boolean {
  const startIso =
    input.resource.spacetime.validFromIso?.trim() ||
    input.resource.spacetime.validUntilIso?.trim() ||
    null;
  if (!startIso) {
    return input.resource.action?.kind === "show_qr";
  }

  const startMs = new Date(startIso).getTime();
  if (Number.isNaN(startMs)) {
    return true;
  }

  const nowMs = input.now.getTime();
  const windowStart = startMs - MAIN_SURFACE_LEAD_MS;
  const endIso = input.resource.spacetime.validUntilIso?.trim() || null;
  const windowEnd = endIso
    ? new Date(endIso).getTime() + MAIN_SURFACE_TAIL_MS
    : startMs + 4 * 60 * 60 * 1000;

  return nowMs >= windowStart && nowMs <= windowEnd;
}

/** MAIN (index 0) → native OS surface payload when spacetime window + action allow. */
export function buildMainNativeSurfacePayload(input: {
  ranked: readonly RankedContextResource[];
  event: EventCandidate;
  now?: Date;
  eyebrowKo?: string;
}): MainNativeSurfacePayload | null {
  const main = input.ranked[0]?.resource ?? null;
  if (!main || !isMainNativeSurfaceEligible(main)) {
    return null;
  }

  const now = input.now ?? new Date();
  if (!isWithinNativeSurfaceWindow({ resource: main, now })) {
    return null;
  }

  const fit = scoreSpacetimeFit({
    capturedAtIso: now.toISOString(),
    lat: null,
    lng: null,
    eventStartIso: main.spacetime.validFromIso ?? input.event.datetime ?? now.toISOString(),
    eventEndIso: main.spacetime.validUntilIso ?? null,
    eventPlace: main.spacetime.placeLabel,
    eventLat: main.spacetime.lat ?? null,
    eventLng: main.spacetime.lng ?? null,
    capturedPlaceLabel: null,
  });

  if (!fit.timeOk && main.spacetime.validFromIso) {
    return null;
  }

  const qrImageSrc = readQrImageSrc(main);
  const action = main.action!;
  const preferScanBrightness = action.kind === "show_qr" && Boolean(qrImageSrc);

  return {
    contractVersion: MAIN_NATIVE_SURFACE_CONTRACT_VERSION,
    surfaceId: `${main.contextEventId}:${main.sourceHubId}`,
    resourceId: main.resourceId,
    contextEventId: main.contextEventId,
    contextTitle: input.event.title.trim(),
    contextPlace:
      main.spacetime.placeLabel?.trim() ||
      input.event.place?.trim() ||
      null,
    kind: main.kind,
    labelKo: main.label,
    shortLabelKo: main.shortLabel ?? null,
    actionKind: action.kind,
    qrImageSrc,
    actionHref: action.href?.trim() || null,
    validFromIso: main.spacetime.validFromIso ?? null,
    validUntilIso: main.spacetime.validUntilIso ?? null,
    placeLabel: main.spacetime.placeLabel ?? null,
    eyebrowKo: input.eyebrowKo?.trim() || "지금",
    ctaLabelKo: action.labelKo,
    preferScanBrightness,
    platforms: ["ios_live_activity", "android_ongoing"],
  };
}

/** JSON-safe command for Capacitor bridge (future). */
export function buildMainNativeSurfaceCommand(input: {
  ranked: readonly RankedContextResource[];
  event: EventCandidate;
  now?: Date;
  eyebrowKo?: string;
}): { lifecycle: "start" | "update" | "end"; payload: MainNativeSurfacePayload | null; atIso: string } {
  const now = input.now ?? new Date();
  const payload = buildMainNativeSurfacePayload(input);
  return {
    lifecycle: payload ? "start" : "end",
    payload,
    atIso: now.toISOString(),
  };
}
