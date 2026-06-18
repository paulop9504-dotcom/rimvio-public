"use client";

import { MapPin, Shield } from "lucide-react";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { cn } from "@/lib/utils";

export type GlobeGpsControlProps = {
  className?: string;
};

/** GPS ingest gate — sensor on/off on Globe surface. */
export function GlobeGpsControl({ className }: GlobeGpsControlProps) {
  const { enabled, setEnabled } = useGpsTrackingEnabled();

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-[#0220470f] bg-white/95 p-2.5 shadow-sm backdrop-blur-md",
        className,
      )}
      data-globe-gps-control
    >
      <div className="flex items-center gap-2 px-0.5">
        <MapPin className="size-3.5 shrink-0 text-[#3182f6]" aria-hidden />
        <span className="text-[11px] font-semibold text-[#191f28]">GPS 추적</span>
      </div>
      <div className="flex rounded-xl bg-[#f2f4f6] p-0.5">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-[10px] py-1.5 text-[11px] font-bold transition",
            enabled ? "bg-white text-[#3182f6] shadow-sm" : "text-[#8b95a1]",
          )}
          aria-pressed={enabled}
          onClick={() => setEnabled(true)}
        >
          ON
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-[10px] py-1.5 text-[11px] font-bold transition",
            !enabled ? "bg-white text-[#191f28] shadow-sm" : "text-[#8b95a1]",
          )}
          aria-pressed={!enabled}
          onClick={() => setEnabled(false)}
        >
          OFF
        </button>
      </div>
      {!enabled ? (
        <div className="flex items-center gap-1.5 rounded-xl bg-[#f9fafb] px-2 py-1.5">
          <Shield className="size-3 shrink-0 text-[#8b95a1]" aria-hidden />
          <span className="text-[10px] font-semibold text-[#6b7684]">
            Privacy Mode Enabled
          </span>
        </div>
      ) : null}
    </div>
  );
}
