"use client";

import { useMemo, useState } from "react";
import { Plane } from "lucide-react";
import { toast } from "sonner";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import { suggestDepartureHubOptions } from "@/lib/globe/suggest-departure-hub-options";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextHubConnectStepProps = {
  event: EventCandidate;
  onComplete: () => void;
  onUpdated?: () => void;
  className?: string;
};

/** First map tap — offer departure hub connect or skip. */
export function GlobeContextHubConnectStep({
  event,
  onComplete,
  onUpdated,
  className,
}: GlobeContextHubConnectStepProps) {
  const [busy, setBusy] = useState(false);
  const place =
    event.place?.trim() || event.title.trim() || copy.globe.contextMediaFocusFallbackTitle;

  const options = useMemo(
    () => suggestDepartureHubOptions({ destinationPlace: place }),
    [place],
  );

  const handleConnect = async (airportId: DepartureHubAirportId) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      connectDepartureHubToContext({
        destinationEventId: event.id,
        airportId,
      });
      const label =
        options.find((row) => row.id === airportId)?.shortLabelKo ?? airportId;
      toast.success(copy.globe.departureHubConnected(label));
      onUpdated?.();
      onComplete();
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : copy.globe.departureHubConnectFail,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-[1.15rem] bg-[#f5f5f7] px-3 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.26)] ring-1 ring-white/15",
        className,
      )}
      data-globe-context-hub-connect-step
    >
      <p className="text-[11px] font-semibold text-[#0071e3]">
        {copy.globe.departureHubEyebrow}
      </p>
      <h2 className="mt-1 text-[16px] font-bold leading-snug tracking-tight text-[#1d1d1f]">
        {copy.globe.departureHubTitle(place)}
      </h2>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[#6e6e73]">
        {copy.globe.departureHubBody}
      </p>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConnect(option.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold active:scale-[0.98]",
                option.recommended
                  ? "border-[#0071e3]/35 bg-[#0071e3]/10 text-[#0071e3]"
                  : "border-black/[0.08] bg-white text-[#1d1d1f]",
                busy && "pointer-events-none opacity-50",
              )}
            >
              <Plane className="size-3.5" aria-hidden />
              {option.shortLabelKo}
              {option.recommended ? (
                <span className="text-[10px] font-medium opacity-80">
                  · {copy.globe.departureHubRecommended}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={busy}
        onClick={onComplete}
        className="mt-3 w-full rounded-full py-2 text-[13px] font-semibold text-[#0071e3] active:bg-black/[0.04]"
      >
        {copy.globe.departureHubSkip}
      </button>

      <p className="mt-2 text-center text-[11px] font-normal text-[#86868b]">
        {copy.globe.contextMapTapMediaHint}
      </p>
    </div>
  );
}
