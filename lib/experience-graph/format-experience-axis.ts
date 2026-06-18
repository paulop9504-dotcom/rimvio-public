import type {
  ExperienceSearchAxis,
  ExperienceVolume,
} from "@/lib/experience-graph/experience-volume-types";
import { formatPlanWindowLabel } from "@/lib/plan-context/format-plan-window-label";

export type ExperienceAxisChip = {
  axis: ExperienceSearchAxis;
  label: string;
};

function formatTimeAxis(volume: ExperienceVolume): string {
  const windowLabel = formatPlanWindowLabel({
    windowStartIso: volume.time.startIso,
    windowEndIso: volume.time.endIso,
    nights:
      volume.time.durationHours && volume.time.durationHours >= 24
        ? Math.round(volume.time.durationHours / 24)
        : undefined,
    windowConfidence: volume.time.endIso ? "confirmed" : "open",
  });
  if (windowLabel) {
    return windowLabel;
  }
  const start = new Date(volume.time.startIso);
  if (Number.isNaN(start.getTime())) {
    return "시간 미정";
  }
  return start.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 3-axis search labels for feed / map / space UI. */
export function formatExperienceAxisChips(volume: ExperienceVolume): ExperienceAxisChip[] {
  const spaceLabel = volume.space.label.trim() || "장소";
  return [
    { axis: "time", label: `시간 · ${formatTimeAxis(volume)}` },
    { axis: "map", label: `지도 · ${spaceLabel}` },
    { axis: "space", label: `공간 · ${spaceLabel}` },
  ];
}

export function formatPrimaryExperiencePeak(volume: ExperienceVolume): string | null {
  const moment = volume.peaks.find((peak) => peak.kind === "moment");
  if (moment) {
    return moment.queryHint;
  }
  const space = volume.peaks.find((peak) => peak.kind === "space");
  return space?.queryHint ?? null;
}
