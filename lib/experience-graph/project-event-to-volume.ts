import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { experienceEventTypeById } from "@/lib/experience-graph/experience-event-type-spec";
import type {
  ExperiencePeak,
  ExperienceVolume,
  SpaceVolume,
  TimeVolume,
} from "@/lib/experience-graph/experience-volume-types";
import { resolveExperienceEventType } from "@/lib/experience-graph/resolve-experience-event-type";
import { resolveExperienceLens } from "@/lib/experience-graph/resolve-experience-lens";

function parseMs(iso?: string | null): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function slugCluster(place: string): string {
  return place
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

function buildTimeVolume(event: EventCandidate): TimeVolume | null {
  const startIso = event.datetime?.trim();
  if (!startIso) {
    return null;
  }
  const startMs = parseMs(startIso);
  if (startMs === null) {
    return null;
  }

  const plan = readPlanContextFromEvent(event);
  const endIso = plan?.windowEndIso?.trim() || null;
  const endMs = endIso ? parseMs(endIso) : null;
  const durationHours =
    endMs != null && endMs > startMs
      ? Math.round(((endMs - startMs) / 3_600_000) * 10) / 10
      : undefined;

  return {
    startIso,
    endIso,
    durationHours,
  };
}

function buildSpaceVolume(event: EventCandidate): SpaceVolume {
  const place = event.place?.trim() || event.title.trim() || "장소 미정";
  return {
    label: place,
    place: event.place?.trim() || null,
    clusterId: slugCluster(place),
  };
}

function buildPeaks(
  event: EventCandidate,
  time: TimeVolume,
  space: SpaceVolume,
): ExperiencePeak[] {
  const peaks: ExperiencePeak[] = [];
  const eventType = resolveExperienceEventType(event);
  const hints = experienceEventTypeById(eventType).peakHints;

  peaks.push({
    id: `${event.id}:peak:space`,
    kind: "space",
    label: `${space.label}${hints.space}`,
    queryHint: `${space.label}${hints.space}`,
    timeAt: time.startIso,
    spaceLabel: space.label,
  });

  if (hints.moment) {
    peaks.push({
      id: `${event.id}:peak:moment`,
      kind: "moment",
      label: `${space.label}${hints.moment}`,
      queryHint: `${space.label}${hints.moment}`,
      timeAt: time.endIso ?? time.startIso,
      spaceLabel: space.label,
    });
  }

  if (hints.dwell && time.durationHours && time.durationHours >= 2) {
    peaks.push({
      id: `${event.id}:peak:dwell`,
      kind: "dwell",
      label: `${Math.round(time.durationHours)}시간 체류`,
      queryHint: hints.dwell,
      timeAt: time.startIso,
      spaceLabel: space.label,
    });
  }

  return peaks;
}

/** Layer 2 — Event SSOT + PlanContext → Experience Volume. Pure read. */
export function projectEventToExperienceVolume(
  event: EventCandidate,
): ExperienceVolume | null {
  const time = buildTimeVolume(event);
  if (!time) {
    return null;
  }

  const plan = readPlanContextFromEvent(event);
  const space = buildSpaceVolume(event);
  const eventType = resolveExperienceEventType(event);
  const activeLens = resolveExperienceLens({
    startIso: time.startIso,
    endIso: time.endIso,
  });

  return {
    id: `ev:${event.id}`,
    title: event.title,
    sourceEventId: event.id,
    activeLayer: "experience_feed",
    time,
    space,
    peaks: buildPeaks(event, time, space),
    planMode: plan?.planMode,
    peerDisplayName: plan?.peerDisplayName ?? null,
    category: event.category,
    eventType,
    activeLens,
  };
}
