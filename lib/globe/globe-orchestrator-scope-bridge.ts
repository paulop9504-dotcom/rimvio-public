/**
 * Globe → chat orchestrator scope handoff (sessionStorage).
 * @see docs/RIMVIO_SCOPE_AI.md
 */

import { findEventCandidate } from "@/lib/events/event-store";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { isExternalPinCluster } from "@/lib/globe/merge-globe-pin-clusters";
import type { PinScope } from "@/lib/globe/pin-entity";
import { readPinScopeFromMetadata } from "@/lib/globe/stamp-universal-pin-metadata";

export const GLOBE_ORCHESTRATOR_SCOPE_KEY = "rimvio.globe.orchestrator-scope.v1";

export type GlobeOrchestratorScopeWire = {
  pinScope: PinScope;
  eventId: string | null;
  title: string | null;
  updatedAtIso: string;
};

export function resolvePinScopeFromEventId(
  eventId: string | null | undefined,
): PinScope | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }
  const event = findEventCandidate(key);
  if (!event) {
    return null;
  }
  return readPinScopeFromMetadata(event.metadata);
}

export function resolvePinScopeFromCluster(
  cluster: PinCluster | null | undefined,
): PinScope | null {
  if (!cluster) {
    return null;
  }
  if (isExternalPinCluster(cluster)) {
    return "external";
  }
  return resolvePinScopeFromEventId(cluster.eventId) ?? "internal";
}

export function writeGlobeOrchestratorScopeHint(
  wire: Omit<GlobeOrchestratorScopeWire, "updatedAtIso">,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: GlobeOrchestratorScopeWire = {
      ...wire,
      updatedAtIso: new Date().toISOString(),
    };
    window.sessionStorage.setItem(
      GLOBE_ORCHESTRATOR_SCOPE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // quota / private mode
  }
}

export function readGlobeOrchestratorScopeHint(): GlobeOrchestratorScopeWire | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(GLOBE_ORCHESTRATOR_SCOPE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<GlobeOrchestratorScopeWire>;
    if (parsed.pinScope !== "internal" && parsed.pinScope !== "external") {
      return null;
    }
    return {
      pinScope: parsed.pinScope,
      eventId: typeof parsed.eventId === "string" ? parsed.eventId : null,
      title: typeof parsed.title === "string" ? parsed.title : null,
      updatedAtIso:
        typeof parsed.updatedAtIso === "string"
          ? parsed.updatedAtIso
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearGlobeOrchestratorScopeHint(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(GLOBE_ORCHESTRATOR_SCOPE_KEY);
  } catch {
    // ignore
  }
}

/** Composer block — parsed by `readPinScopeFromComposerContext`. */
export function buildGlobeComposerScopeBlock(
  wire: Pick<GlobeOrchestratorScopeWire, "pinScope" | "eventId" | "title">,
): string {
  const lines = [
    "[globe-context]",
    `pin_scope: ${wire.pinScope}`,
    wire.eventId ? `eventId: ${wire.eventId}` : null,
    wire.title ? `title: ${wire.title.slice(0, 120)}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function resolveChatPinScopeHint(): PinScope | null {
  const globe = readGlobeOrchestratorScopeHint();
  if (globe?.pinScope) {
    return globe.pinScope;
  }
  if (typeof window === "undefined") {
    return null;
  }
  const recallEventId = new URLSearchParams(window.location.search)
    .get("recallEvent")
    ?.trim();
  if (!recallEventId) {
    return null;
  }
  return resolvePinScopeFromEventId(recallEventId);
}

export function buildChatGlobeComposerScopeBlock(): string | null {
  const globe = readGlobeOrchestratorScopeHint();
  if (globe) {
    return buildGlobeComposerScopeBlock(globe);
  }
  if (typeof window === "undefined") {
    return null;
  }
  const recallEventId = new URLSearchParams(window.location.search)
    .get("recallEvent")
    ?.trim();
  if (!recallEventId) {
    return null;
  }
  const pinScope = resolvePinScopeFromEventId(recallEventId);
  if (!pinScope) {
    return null;
  }
  const event = findEventCandidate(recallEventId);
  return buildGlobeComposerScopeBlock({
    pinScope,
    eventId: recallEventId,
    title: event?.title ?? null,
  });
}
