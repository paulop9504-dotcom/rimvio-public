"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { hasPendingFeedCaptureVerify, readDwellMinutesFromCaptures } from "@/lib/feed/feed-capture-metadata";
import { verifyFeedCaptureEvent } from "@/lib/feed/verify-feed-capture";
import { formatDwellMinutesLabel } from "@/lib/feed/project-dwell-from-gps-pings";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import {
  isGlobeLocationConfirmed,
  markGlobeLocationConfirmed,
} from "@/lib/globe/globe-location-confirm-store";
import { cn } from "@/lib/utils";

export type GlobeLocationConfirmCardProps = {
  className?: string;
};

/** Human confirmation — GPS ingest enriches; user confirms before trust rises. */
export function GlobeLocationConfirmCard({ className }: GlobeLocationConfirmCardProps) {
  const { enabled } = useGpsTrackingEnabled();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  const [dismissedIds, setDismissedIds] = useState<readonly string[]>([]);

  const pending = useMemo(() => {
    if (!enabled) {
      return null;
    }
    const events = listLifeEventCandidates();
    return (
      events.find((event) => {
        if (event.metadata?.targetingSource !== "gps_background") {
          return false;
        }
        if (!hasPendingFeedCaptureVerify(event)) {
          return false;
        }
        if (dismissedIds.includes(event.id)) {
          return false;
        }
        const place = event.place?.trim();
        if (place && isGlobeLocationConfirmed(place, event.datetime)) {
          return false;
        }
        return true;
      }) ?? null
    );
  }, [enabled, revision, dismissedIds]);

  const onConfirm = useCallback(() => {
    if (!pending) {
      return;
    }
    const result = verifyFeedCaptureEvent(pending.id);
    if (result.ok) {
      const place = pending.place?.trim();
      if (place) {
        markGlobeLocationConfirmed(place, pending.datetime);
      }
      setDismissedIds((rows) =>
        rows.includes(pending.id) ? rows : [...rows, pending.id],
      );
    }
    setRevision((value) => value + 1);
  }, [pending]);

  const onDismiss = useCallback(() => {
    if (!pending) {
      return;
    }
    setDismissedIds((rows) => [...rows, pending.id]);
  }, [pending]);

  if (!pending) {
    return null;
  }

  const place = pending.place?.trim() || "이 위치";
  const dwellMinutes = readDwellMinutesFromCaptures(pending);
  const dwellLabel =
    dwellMinutes != null ? formatDwellMinutesLabel(dwellMinutes) : null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#0220470f] bg-white/95 p-3 shadow-sm backdrop-blur-md",
        className,
      )}
      data-globe-location-confirm
    >
      <p className="text-[12px] font-semibold leading-snug text-[#191f28]">
        {copy.globe.inboxLocationTitle(place, dwellLabel ?? undefined)}
      </p>
      {dwellLabel ? (
        <p className="mt-0.5 text-[11px] text-[#6b7684]">
          {copy.globe.globeLocationAccumulated(dwellLabel)}
        </p>
      ) : null}
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-[#3182f6] py-2 text-[12px] font-bold text-white active:opacity-90"
          onClick={onConfirm}
        >
          맞아요
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border border-[#02204714] bg-[#f2f4f6] py-2 text-[12px] font-semibold text-[#6b7684] active:opacity-90"
          onClick={onDismiss}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
