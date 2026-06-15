import { formatPeerRangLabel } from "@/lib/copy/korean-peer-with";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedTimelineAggregate } from "@/lib/feed/feed-timeline-aggregate-types";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";

function shortPlaceLabel(plan: PlanContext): string | null {
  const place = plan.place?.trim();
  if (place) {
    return place;
  }
  const title = plan.title?.trim();
  if (!title) {
    return null;
  }
  return title.replace(/\s*여행$/u, "").trim() || title;
}

function localDayStamp(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function planDayLabelForMoment(
  windowStartIso: string,
  windowEndIso: string | null,
  momentIso: string,
): string | null {
  const startMs = parseIsoMs(windowStartIso);
  const momentMs = parseIsoMs(momentIso);
  const endMs = parseIsoMs(windowEndIso);
  if (startMs === null || momentMs === null || endMs === null) {
    return null;
  }

  const startDay = localDayStamp(new Date(startMs));
  const momentDay = localDayStamp(new Date(momentMs));
  const endDay = localDayStamp(new Date(endMs));
  if (momentDay < startDay || momentDay > endDay) {
    return null;
  }

  const dayIndex = Math.floor((momentDay - startDay) / 86_400_000) + 1;
  if (dayIndex < 1 || dayIndex > 14) {
    return null;
  }
  return `Day ${dayIndex}`;
}

export type ExperienceSlotHeadline = {
  headline: string;
  eyebrow: string | null;
};

/** Experience-first headline — plan title + Day N over task-style calendar lines. */
export function deriveExperienceSlotHeadline(input: {
  event: EventCandidate | null | undefined;
  plan: PlanContext | null | undefined;
  fallbackHeadline: string;
  aggregate?: FeedTimelineAggregate;
  now?: Date;
}): ExperienceSlotHeadline {
  const nowIso = (input.now ?? new Date()).toISOString();
  const plan = input.plan;
  const event = input.event;

  if (plan?.title?.trim()) {
    const dayLabel = plan.windowStartIso
      ? planDayLabelForMoment(
          plan.windowStartIso,
          plan.windowEndIso,
          event?.datetime ?? nowIso,
        )
      : null;
    const peerPrefix = formatPeerRangLabel(plan.peerDisplayName ?? "");
    const placeShort = shortPlaceLabel(plan);
    if (peerPrefix && placeShort && dayLabel) {
      return {
        headline: `${peerPrefix} ${placeShort} ${dayLabel}`,
        eyebrow: null,
      };
    }
    const place = plan.place?.trim();
    return {
      headline: plan.title.trim(),
      eyebrow: dayLabel ?? place ?? null,
    };
  }

  if (event?.title?.trim()) {
    const meta = event.metadata ?? {};
    const isAutoExperience =
      meta.autoIngested === true ||
      meta.targetingSource === "gps_background" ||
      meta.targetingSource === "capture_bootstrap";
    if (isAutoExperience || event.category === "travel") {
      return {
        headline: event.title.trim(),
        eyebrow: event.place?.trim() ?? null,
      };
    }
  }

  if (input.aggregate?.hasContent && event?.place?.trim()) {
    return {
      headline: event.place.trim(),
      eyebrow: null,
    };
  }

  return {
    headline: input.fallbackHeadline,
    eyebrow: null,
  };
}
