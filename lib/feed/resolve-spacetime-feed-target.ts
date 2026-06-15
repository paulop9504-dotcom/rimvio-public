import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpacetimeFeedTargetMatch } from "@/lib/feed/feed-capture-types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { haversineKm, parseIsoMs, scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";

const PLAN_ARRIVAL_PROXIMITY_KM = 35;
const PLAN_ARRIVAL_PROXIMITY_BOOST = 0.25;

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readEventPlaceAnchor(
  event: EventCandidate,
): { lat: number; lng: number } | null {
  const meta = event.metadata ?? {};
  const lat = readFiniteCoord(meta.globePlaceLat);
  const lng = readFiniteCoord(meta.globePlaceLng);
  if (lat !== null && lng !== null) {
    return { lat, lng };
  }
  return null;
}

const PLACE_HINT_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /제주|애월|성산/u, label: "제주" },
  { pattern: /강남역|강남/u, label: "강남역" },
  { pattern: /둔산/u, label: "둔산동" },
  { pattern: /부산|해운대/u, label: "부산" },
  { pattern: /홍대|연남/u, label: "홍대" },
  { pattern: /성수/u, label: "성수" },
  { pattern: /오사카/u, label: "오사카" },
  { pattern: /독일|베를린|뮌헨|프랑크푸르트/u, label: "독일" },
];

export function extractPlaceHintFromText(text?: string | null): string | null {
  const hay = text?.trim();
  if (!hay) {
    return null;
  }
  for (const entry of PLACE_HINT_PATTERNS) {
    if (entry.pattern.test(hay)) {
      return entry.label;
    }
  }
  return null;
}

function localDayStamp(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function planDayLabel(
  startIso: string,
  endIso: string | null,
  capturedIso: string,
): string | null {
  const startMs = parseIsoMs(startIso);
  const capMs = parseIsoMs(capturedIso);
  const endMs = parseIsoMs(endIso);
  if (startMs === null || capMs === null || endMs === null) {
    return null;
  }

  const startDay = localDayStamp(new Date(startMs));
  const capDay = localDayStamp(new Date(capMs));
  const endDay = localDayStamp(new Date(endMs));
  if (capDay < startDay || capDay > endDay) {
    return null;
  }

  const dayIndex = Math.floor((capDay - startDay) / 86_400_000) + 1;
  if (dayIndex < 1 || dayIndex > 14) {
    return null;
  }
  return `Day ${dayIndex}`;
}

function globeManualContextBoost(
  event: EventCandidate,
  memoText?: string | null,
): number {
  if (event.metadata?.globeManualContext !== true) {
    return 0;
  }
  const hay = memoText?.trim().toLowerCase() ?? "";
  const title = event.title.trim().toLowerCase();
  const place = event.place?.trim().toLowerCase() ?? "";
  const plan = readPlanContextFromEvent(event);
  const planPlace = plan?.place?.trim().toLowerCase() ?? "";

  if (hay && title && hay.includes(title)) {
    return 0.2;
  }
  if (hay && place && hay.includes(place)) {
    return 0.16;
  }
  if (hay && planPlace && hay.includes(planPlace)) {
    return 0.16;
  }
  return 0.1;
}

function lifecycleRank(lifecycle: EventCandidate["lifecycle"]): number {
  if (lifecycle === "active") {
    return 4;
  }
  if (lifecycle === "scheduled") {
    return 3;
  }
  if (lifecycle === "completed") {
    return 2;
  }
  if (lifecycle === "archived") {
    return 0;
  }
  return 1;
}

function toConfidence(score: number, planBoost: boolean): SpacetimeFeedTargetMatch["confidence"] {
  const adjusted = planBoost ? score + 0.08 : score;
  if (adjusted >= 0.82) {
    return "high";
  }
  if (adjusted >= 0.62) {
    return "medium";
  }
  return "low";
}

export type ResolveSpacetimeFeedTargetInput = {
  capturedAtIso: string;
  lat?: number | null;
  lng?: number | null;
  placeLabel?: string | null;
  memoText?: string | null;
  events: readonly EventCandidate[];
};

/** Pure read — best Feed event for a capture's spacetime. */
export function resolveSpacetimeFeedTarget(
  input: ResolveSpacetimeFeedTargetInput,
): SpacetimeFeedTargetMatch | null {
  const memoPlace = extractPlaceHintFromText(input.memoText);
  const capturedPlace = input.placeLabel?.trim() || memoPlace || null;

  const candidates = input.events
    .filter((event) => event.lifecycle !== "archived" && event.datetime?.trim())
    .map((event) => {
      const plan = readPlanContextFromEvent(event);
      const anchor = readEventPlaceAnchor(event);
      const fit = scoreSpacetimeFit({
        capturedAtIso: input.capturedAtIso,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        eventStartIso: event.datetime!,
        eventEndIso: plan?.windowEndIso ?? null,
        eventPlace: plan?.place ?? event.place,
        eventLat: anchor?.lat ?? null,
        eventLng: anchor?.lng ?? null,
        capturedPlaceLabel: capturedPlace,
      });

      const planBoost = Boolean(plan?.windowEndIso);
      let score = fit.score;
      if (planBoost && fit.timeOk) {
        score += 0.12;
      }
      score += lifecycleRank(event.lifecycle) * 0.02;
      if (fit.timeOk) {
        score += globeManualContextBoost(event, input.memoText);
      }

      const planPlace = plan?.place?.trim() || event.place?.trim();
      if (input.lat != null && input.lng != null && fit.timeOk) {
        const coords = anchor ?? (planPlace ? resolvePlaceCoordinates(planPlace) : null);
        if (
          coords &&
          haversineKm(input.lat, input.lng, coords.lat, coords.lng) <=
            PLAN_ARRIVAL_PROXIMITY_KM
        ) {
          score += PLAN_ARRIVAL_PROXIMITY_BOOST;
        }
      }

      const dayLabel = plan?.windowEndIso
        ? planDayLabel(event.datetime!, plan.windowEndIso, input.capturedAtIso)
        : null;

      return {
        event,
        plan,
        fit,
        score,
        dayLabel,
        confidence: toConfidence(score, planBoost),
      };
    })
    .filter((row) => row.fit.fits)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) {
    return null;
  }

  const place = best.plan?.place ?? best.event.place ?? capturedPlace ?? null;
  const reason = best.dayLabel
    ? `${best.event.title} · ${best.dayLabel}`
    : best.event.title;

  return {
    eventId: best.event.id,
    eventTitle: best.event.title,
    confidence: best.confidence,
    score: best.score,
    placeLabel: place,
    dayLabel: best.dayLabel,
    reason,
  };
}

export function listSpacetimeFeedTargetCandidates(
  input: ResolveSpacetimeFeedTargetInput,
  limit = 3,
): SpacetimeFeedTargetMatch[] {
  const memoPlace = extractPlaceHintFromText(input.memoText);
  const capturedPlace = input.placeLabel?.trim() || memoPlace || null;

  return input.events
    .filter((event) => event.lifecycle !== "archived" && event.datetime?.trim())
    .map((event) => {
      const plan = readPlanContextFromEvent(event);
      const anchor = readEventPlaceAnchor(event);
      const fit = scoreSpacetimeFit({
        capturedAtIso: input.capturedAtIso,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        eventStartIso: event.datetime!,
        eventEndIso: plan?.windowEndIso ?? null,
        eventPlace: plan?.place ?? event.place,
        eventLat: anchor?.lat ?? null,
        eventLng: anchor?.lng ?? null,
        capturedPlaceLabel: capturedPlace,
      });
      const planBoost = Boolean(plan?.windowEndIso);
      let score = fit.score;
      if (planBoost && fit.timeOk) {
        score += 0.12;
      }
      score += lifecycleRank(event.lifecycle) * 0.02;
      if (fit.timeOk) {
        score += globeManualContextBoost(event, input.memoText);
      }
      const dayLabel = plan?.windowEndIso
        ? planDayLabel(event.datetime!, plan.windowEndIso, input.capturedAtIso)
        : null;
      return {
        event,
        fit,
        score,
        dayLabel,
        confidence: toConfidence(score, planBoost),
        placeLabel: plan?.place ?? event.place ?? capturedPlace,
      };
    })
    .filter((row) => row.fit.timeOk)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => ({
      eventId: row.event.id,
      eventTitle: row.event.title,
      confidence: row.confidence,
      score: row.score,
      placeLabel: row.placeLabel ?? null,
      dayLabel: row.dayLabel,
      reason: row.dayLabel
        ? `${row.event.title} · ${row.dayLabel}`
        : row.event.title,
    }));
}
