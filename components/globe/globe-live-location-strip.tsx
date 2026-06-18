"use client";

import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { formatGpsAccuracyLabel } from "@/lib/globe/format-gps-accuracy-label";
import { cn } from "@/lib/utils";

export type GlobeLiveLocationStripProps = {
  className?: string;
};

/** Current place + context projection when GPS ingest is on. */
export function GlobeLiveLocationStrip({ className }: GlobeLiveLocationStripProps) {
  const { enabled } = useGpsTrackingEnabled();
  const snapshot = useLiveLocationSnapshot();

  if (!enabled) {
    return null;
  }

  if (!snapshot) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[#0220470f] bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-md",
          className,
        )}
        data-globe-live-location-waiting
      >
        <p className="text-[10px] font-semibold text-[#8b95a1]">● 위치 확인 중…</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#0220470f] bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-md",
        className,
      )}
      data-globe-live-location-strip
    >
      <p className="text-[10px] font-bold text-[#3182f6]">● You Are Here</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-[11px] text-[#6b7684]">
          <span className="font-semibold text-[#8b95a1]">장소</span>{" "}
          <span className="font-semibold text-[#191f28]">{snapshot.placeLabel}</span>
        </p>
        <p className="text-[11px] text-[#6b7684]">
          <span className="font-semibold text-[#8b95a1]">맥락</span>{" "}
          <span className="font-semibold text-[#191f28]">{snapshot.contextLabel}</span>
        </p>
        <p className="text-[11px] text-[#6b7684]">
          <span className="font-semibold text-[#8b95a1]">시간</span>{" "}
          <span className="font-semibold text-[#191f28]">{snapshot.timeLabel}</span>
        </p>
        {formatGpsAccuracyLabel(snapshot.accuracyM) ? (
          <p className="text-[11px] text-[#6b7684]">
            <span className="font-semibold text-[#8b95a1]">정확도</span>{" "}
            <span className="font-semibold text-[#3182f6]">
              {formatGpsAccuracyLabel(snapshot.accuracyM)}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
