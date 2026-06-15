import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { deriveExperienceSlotHeadline } from "@/lib/feed/derive-experience-slot-headline";
import { formatPlanWindowLabel } from "@/lib/plan-context/format-plan-window-label";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type SearchableExperienceRow = {
  eventId: string;
  headline: string;
  eyebrow: string | null;
  peerDisplayName: string | null;
  place: string | null;
  timeLabel: string | null;
  captureCount: number;
  searchBlob: string;
};

function buildSearchBlob(parts: readonly (string | null | undefined)[]): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .toLowerCase();
}

/** Pure read — index committed events for related-context search (projection only). */
export function buildSearchableExperienceIndex(
  events: readonly EventCandidate[],
  now = new Date(),
): SearchableExperienceRow[] {
  const rows: SearchableExperienceRow[] = [];

  for (const event of events) {
    if (event.lifecycle === "archived") {
      continue;
    }

    const plan = readPlanContextFromEvent(event);
    const captures = readFeedCaptureFragments(event);
    const hasExperienceSignal =
      Boolean(plan) ||
      captures.length > 0 ||
      event.category === "travel" ||
      event.category === "social" ||
      event.metadata?.feedPlanEnabled === true;

    if (!hasExperienceSignal && !event.place?.trim()) {
      continue;
    }

    const headline = deriveExperienceSlotHeadline({
      event,
      plan,
      fallbackHeadline: event.title,
      now,
    });

    const timeLabel =
      plan &&
      formatPlanWindowLabel({
        windowStartIso: plan.windowStartIso,
        windowEndIso: plan.windowEndIso,
        nights: plan.nights,
        windowConfidence: plan.windowConfidence,
      });

    const captureLabels = captures
      .map((row) => row.placeLabel ?? row.label ?? "")
      .filter(Boolean);

    rows.push({
      eventId: event.id,
      headline: headline.headline,
      eyebrow: headline.eyebrow,
      peerDisplayName: plan?.peerDisplayName ?? null,
      place: plan?.place ?? event.place ?? null,
      timeLabel: timeLabel || null,
      captureCount: captures.length,
      searchBlob: buildSearchBlob([
        headline.headline,
        headline.eyebrow,
        event.title,
        plan?.title,
        plan?.peerDisplayName,
        plan?.place,
        event.place,
        event.category,
        ...captureLabels,
      ]),
    });
  }

  return rows.sort((a, b) => b.captureCount - a.captureCount);
}
