"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Shield } from "lucide-react";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { formatGpsAccuracyLabel } from "@/lib/globe/format-gps-accuracy-label";
import { cn } from "@/lib/utils";

export type GlobeGpsPanelProps = {
  className?: string;
  onFlyToHere?: () => void;
  /** Render inside GlobeContextControlDock — no outer card chrome. */
  embedded?: boolean;
};

function collapsedSummary(input: {
  enabled: boolean;
  waiting: boolean;
  contextLabel: string | null;
  accuracyM: number | null;
}): string {
  if (!input.enabled) {
    return "GPS 꺼짐";
  }
  if (input.waiting) {
    return "위치 확인 중…";
  }
  const accuracy = formatGpsAccuracyLabel(input.accuracyM);
  const parts = [input.contextLabel ?? "여기"].filter(Boolean);
  if (accuracy) {
    parts.push(accuracy);
  }
  return parts.join(" · ");
}

/** Compact GPS gate + live location — collapsed by default on mobile. */
export function GlobeGpsPanel({
  className,
  onFlyToHere,
  embedded = false,
}: GlobeGpsPanelProps) {
  const { enabled, setEnabled } = useGpsTrackingEnabled();
  const snapshot = useLiveLocationSnapshot();
  const [expanded, setExpanded] = useState(false);

  const waiting = enabled && !snapshot;
  const summary = collapsedSummary({
    enabled,
    waiting,
    contextLabel: snapshot?.contextLabel ?? null,
    accuracyM: snapshot?.accuracyM ?? null,
  });

  return (
    <div
      className={cn(
        embedded
          ? "border-t border-border/60"
          : "w-[min(100%,11.25rem)] rounded-2xl border border-[#0220470f] bg-white/95 shadow-sm backdrop-blur-md",
        className,
      )}
      data-globe-gps-panel
      data-globe-gps-expanded={expanded ? "true" : "false"}
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-1.5 text-left",
          embedded ? "px-2.5 py-2" : "px-2 py-1.5",
        )}
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        {enabled ? (
          <MapPin className="size-3 shrink-0 text-[#3182f6]" aria-hidden />
        ) : (
          <Shield className="size-3 shrink-0 text-[#8b95a1]" aria-hidden />
        )}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[10px] font-semibold",
            enabled ? "text-[#191f28]" : "text-[#6b7684]",
          )}
        >
          {summary}
        </span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 text-[#8b95a1] transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div
          className={cn(
            "space-y-2 border-t border-[#02204708] pt-1.5",
            embedded ? "px-2.5 pb-2.5" : "px-2 pb-2",
          )}
        >
          <div className="flex rounded-xl bg-[#f2f4f6] p-0.5">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-[10px] py-1 text-[10px] font-bold transition",
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
                "flex-1 rounded-[10px] py-1 text-[10px] font-bold transition",
                !enabled ? "bg-white text-[#191f28] shadow-sm" : "text-[#8b95a1]",
              )}
              aria-pressed={!enabled}
              onClick={() => setEnabled(false)}
            >
              OFF
            </button>
          </div>

          {!enabled ? (
            <p className="text-[10px] font-semibold text-[#6b7684]">Privacy Mode</p>
          ) : waiting ? (
            <p className="text-[10px] font-semibold text-[#8b95a1]">● 위치 확인 중…</p>
          ) : snapshot ? (
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-[#3182f6]">● 여기</p>
              <p className="text-[10px] text-[#6b7684]">
                <span className="font-semibold text-[#8b95a1]">장소</span>{" "}
                <span className="font-semibold text-[#191f28]">{snapshot.placeLabel}</span>
              </p>
              <p className="text-[10px] text-[#6b7684]">
                <span className="font-semibold text-[#8b95a1]">맥락</span>{" "}
                <span className="font-semibold text-[#191f28]">{snapshot.contextLabel}</span>
              </p>
              <p className="text-[10px] text-[#6b7684]">
                <span className="font-semibold text-[#8b95a1]">시간</span>{" "}
                <span className="font-semibold text-[#191f28]">{snapshot.timeLabel}</span>
              </p>
              {formatGpsAccuracyLabel(snapshot.accuracyM) ? (
                <p className="text-[10px] text-[#6b7684]">
                  <span className="font-semibold text-[#8b95a1]">정확도</span>{" "}
                  <span className="font-semibold text-[#3182f6]">
                    {formatGpsAccuracyLabel(snapshot.accuracyM)}
                  </span>
                </p>
              ) : null}
              {onFlyToHere ? (
                <button
                  type="button"
                  className="mt-1.5 w-full rounded-xl bg-[#3182f6] px-2 py-2 text-[10px] font-bold text-white shadow-sm"
                  onClick={onFlyToHere}
                >
                  여기로 이동
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
