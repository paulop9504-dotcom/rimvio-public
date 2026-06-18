import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { resolveContextLodgingDestinationAnchor } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import {
  estimateLodgingTransit,
  formatWalkMinutesLabel,
} from "@/lib/globe/lodging/estimate-lodging-transit";
import type {
  LodgingContextMode,
  LodgingDynamicTags,
} from "@/lib/globe/lodging/lodging-dynamic-tag-types";
import { readExecutionProfileId } from "@/lib/globe/passive-context/infer-execution-profile";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const NEAR_DESTINATION_KM = 25;
const CHECKOUT_BUFFER_MIN = 15;

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function inferLodgingContextMode(event: EventCandidate): LodgingContextMode {
  const profile = readExecutionProfileId(event.metadata);
  if (profile === "theme_park_day") {
    return "theme_park_day";
  }
  if (profile === "outdoor_long_day") {
    return "outdoor_long_day";
  }
  const blob = `${event.title} ${event.place ?? ""} ${event.description ?? ""}`;
  if (/(?:출장|미팅|회의|meeting|business\s*trip|업무|보고|발표|사무실)/iu.test(blob)) {
    return "business_trip";
  }
  return "leisure_travel";
}

function readMeetingDate(event: EventCandidate, now: Date): Date | null {
  const plan = readPlanContextFromEvent(event);
  const iso = plan?.windowStartIso?.trim() || event.datetime?.trim();
  if (!iso) {
    return null;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const sameDay =
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate();
  if (!sameDay && parsed.getTime() < now.getTime()) {
    return null;
  }
  return parsed;
}

function isOverseasContext(event: EventCandidate): boolean {
  const place = event.place?.trim() || event.title.trim();
  return classifyOverseasManualPlace(place)?.isOverseas === true;
}

function buildTransitChips(input: {
  event: EventCandidate;
  lodgingLat: number;
  lodgingLng: number;
  userLat: number | null;
  userLng: number | null;
}): LodgingDynamicTags["chips"] {
  const anchor = resolveContextLodgingDestinationAnchor(input.event);
  const overseas = isOverseasContext(input.event);
  const chips: LodgingDynamicTags["chips"][number][] = [];

  const userNearDestination =
    input.userLat != null &&
    input.userLng != null &&
    haversineKm(input.userLat, input.userLng, anchor.lat, anchor.lng) <=
      NEAR_DESTINATION_KM;

  if (userNearDestination && input.userLat != null && input.userLng != null) {
    const toLodging = estimateLodgingTransit(
      input.userLat,
      input.userLng,
      input.lodgingLat,
      input.lodgingLng,
    );
    chips.push({
      id: "walk_user_lodging",
      label: copy.globe.lodgingDynamicWalk(formatWalkMinutesLabel(toLodging.walkMinutes)),
    });
    chips.push({
      id: "taxi_user_lodging",
      label: overseas
        ? copy.globe.lodgingDynamicTaxiIntl(toLodging.taxiFareYen)
        : copy.globe.lodgingDynamicTaxiKrw(toLodging.taxiFareKrw),
    });
    return chips;
  }

  const toHub = estimateLodgingTransit(
    input.lodgingLat,
    input.lodgingLng,
    anchor.lat,
    anchor.lng,
  );
  if (toHub.distanceKm >= 0.15) {
    chips.push({
      id: "walk_lodging_hub",
      label: copy.globe.lodgingDynamicToHubWalk(formatWalkMinutesLabel(toHub.walkMinutes)),
    });
    chips.push({
      id: "taxi_lodging_hub",
      label: overseas
        ? copy.globe.lodgingDynamicTaxiIntl(toHub.taxiFareYen)
        : copy.globe.lodgingDynamicTaxiKrw(toHub.taxiFareKrw),
    });
  }

  return chips;
}

function buildContextLine(input: {
  event: EventCandidate;
  mode: LodgingContextMode;
  lodgingLat: number;
  lodgingLng: number;
  tempC: number | null;
  now: Date;
}): string | null {
  const anchor = resolveContextLodgingDestinationAnchor(input.event);
  const hubTransit = estimateLodgingTransit(
    input.lodgingLat,
    input.lodgingLng,
    anchor.lat,
    anchor.lng,
  );
  const meeting = readMeetingDate(input.event, input.now);
  const placeLabel = input.event.place?.trim() || "거점";
  const hour = input.now.getHours();

  if (input.mode === "business_trip" && meeting) {
    const meetingHour = meeting.getHours();
    const minutesUntilMeeting = Math.round(
      (meeting.getTime() - input.now.getTime()) / 60_000,
    );
    const travelWithBuffer = hubTransit.taxiMinutes + CHECKOUT_BUFFER_MIN;

    if (
      hour >= 6 &&
      hour <= 10 &&
      meetingHour >= 8 &&
      meetingHour <= 12 &&
      minutesUntilMeeting > 0 &&
      minutesUntilMeeting <= 180 &&
      travelWithBuffer <= minutesUntilMeeting
    ) {
      return copy.globe.lodgingDynamicCheckoutOnTime(meetingHour);
    }

    if (hour >= 7 && hour <= 9 && hubTransit.walkMinutes <= 25) {
      return copy.globe.lodgingDynamicBreakfastRoute();
    }

    if (hubTransit.taxiMinutes <= 15) {
      return copy.globe.lodgingDynamicMeetingCommute(hubTransit.taxiMinutes);
    }

    return copy.globe.lodgingDynamicBusinessStay(hubTransit.taxiMinutes);
  }

  if (input.mode === "theme_park_day") {
    return copy.globe.lodgingDynamicThemePark(
      Math.min(hubTransit.walkMinutes, 45),
    );
  }

  if (input.tempC != null && input.tempC >= 30) {
    return copy.globe.lodgingDynamicHotDayRest(input.tempC);
  }

  if (input.mode === "outdoor_long_day") {
    return copy.globe.lodgingDynamicOutdoorRest(placeLabel);
  }

  return copy.globe.lodgingDynamicLeisureWalk(placeLabel);
}

/** Rule-based dynamic tags for lodging focus — LLM optional later. */
export function buildLodgingDynamicTags(input: {
  event: EventCandidate;
  lodgingLat: number;
  lodgingLng: number;
  userLat?: number | null;
  userLng?: number | null;
  tempC?: number | null;
  now?: Date;
}): LodgingDynamicTags {
  const userLat = readFiniteCoord(input.userLat);
  const userLng = readFiniteCoord(input.userLng);
  const now = input.now ?? new Date();
  const mode = inferLodgingContextMode(input.event);

  const chips = buildTransitChips({
    event: input.event,
    lodgingLat: input.lodgingLat,
    lodgingLng: input.lodgingLng,
    userLat,
    userLng,
  });

  const contextLine = buildContextLine({
    event: input.event,
    mode,
    lodgingLat: input.lodgingLat,
    lodgingLng: input.lodgingLng,
    tempC: input.tempC ?? null,
    now,
  });

  return { chips, contextLine };
}
