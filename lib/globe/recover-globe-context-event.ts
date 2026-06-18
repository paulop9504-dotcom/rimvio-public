"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function parsePlanEventStartMs(eventId: string): number | null {
  const parts = eventId.trim().split(":");
  const last = parts[parts.length - 1];
  if (!last) {
    return null;
  }
  const ms = Number(last);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

function toLocalEventIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** Personal pin survived prune — rebuild anchor event for attach/edit. */
export function recoverGlobeContextEventFromPin(
  eventId: string,
): EventCandidate | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  const existing = findLifeEventCandidate(key);
  if (existing) {
    return existing;
  }

  const pin = findPersonalGlobePinByEventId(key);
  if (!pin) {
    return null;
  }

  const startMs =
    parsePlanEventStartMs(key) ??
    Date.parse(pin.createdAtIso) ??
    Date.now();
  const start = new Date(startMs);
  const title = pin.experienceTitle.trim() || pin.placeLabel.trim() || "맥락";
  const place = pin.placeLabel.trim() || undefined;
  const stamp = new Date().toISOString();

  return commitEventUpsert({
    id: key,
    title,
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: toLocalEventIso(start),
    place,
    confidence: 0.9,
    metadata: {
      feedPlanEnabled: true,
      targetingSource: "globe_manual",
      globeManualContext: true,
      globeRecoveredFromPin: true,
    },
    lifecycleUpdatedAt: stamp,
  });
}
