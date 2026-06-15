import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { buildExtractedDataFromText } from "@/lib/action-chat/confirmation-logic";
import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import {
  extractTravelDestination,
  isTravelTripAnnouncement,
} from "@/lib/action-chat/try-travel-trip-announcement";
import type {
  ClarifyMode,
  CommitSlotName,
  EventIntentKind,
  ParsedEventIntent,
} from "@/lib/event-commit-gate/types";

const TIMED =
  /(?:\d{1,3}\s*시간\s*(?:뒤|후|뒤에|후에)|\d{1,3}\s*분\s*(?:뒤|후|뒤에|후에)|내일|모레|\d{1,2}\s*시|\d{1,2}:\d{2})/iu;

const WORK_SCHEDULE =
  /(?:미팅|회의|약속|면접|병원|치과|헤어|미용|예약|일정|스케줄|interview|meeting)/iu;

const NAVIGATE =
  /(?:길\s*찾|길찾|가\s*줘|가자|이동|출발|도착|까지|내비|네비|route|navigate|택시|버스|지하철)/iu;

const MEAL =
  /(?:맛집|배고|먹|식당|카페|메뉴|배달|점심|저녁|아침)/iu;

const PLACE_NOISE =
  /^(?:미팅|회의|약속|일정|면접|예약|병원|치과|헤어|미용|스케줄|meeting|interview)$/iu;

function isRealPlaceName(value: string | null | undefined): value is string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length < 2) {
    return false;
  }
  return !PLACE_NOISE.test(trimmed);
}

const SLOT_PRIORITY: CommitSlotName[] = [
  "datetime",
  "location",
  "place",
  "target",
  "recipient",
];

function extractRelativeTimeExpression(message: string): string | null {
  const match = message.match(
    /(?:\d{1,3}\s*시간\s*(?:뒤|후|뒤에|후에)|\d{1,3}\s*분\s*(?:뒤|후|뒤에|후에)|내일|모레)/iu,
  );
  return match?.[0]?.trim() ?? null;
}

function pickPrimaryMissing(missing: CommitSlotName[]): CommitSlotName | null {
  for (const slot of SLOT_PRIORITY) {
    if (missing.includes(slot)) {
      return slot;
    }
  }
  return missing[0] ?? null;
}

function resolveClarifyMode(
  intent: EventIntentKind,
  primaryMissing: CommitSlotName | null,
): ClarifyMode | null {
  if (!primaryMissing) {
    return null;
  }
  if (intent === "navigate" || intent === "meal") {
    return "slot_collect";
  }
  if (
    primaryMissing === "location" ||
    primaryMissing === "place" ||
    primaryMissing === "datetime"
  ) {
    return "schedule_confirm";
  }
  return "slot_collect";
}

function parseTravelIntent(
  message: string,
  referenceDate: string,
): ParsedEventIntent | null {
  if (!isTravelTripAnnouncement(message)) {
    return null;
  }

  const location = extractTravelDestination(message);
  const timeExpression = extractRelativeTimeExpression(message);
  const extracted = buildExtractedDataFromText(message, referenceDate);
  const datetime = extracted.datetime;
  const filled_slots: Partial<Record<CommitSlotName, string>> = {};
  const missing_slots: CommitSlotName[] = [];

  if (location) {
    filled_slots.location = location;
  } else {
    missing_slots.push("location");
  }
  if (timeExpression) {
    filled_slots.datetime = timeExpression;
  } else if (datetime) {
    filled_slots.datetime = datetime;
  }

  const primary_missing = pickPrimaryMissing(missing_slots);

  return {
    intent: "travel",
    title: location ? `${location} 여행` : "여행",
    filled_slots,
    missing_slots,
    primary_missing,
    clarify_mode: resolveClarifyMode("travel", primary_missing),
    confidence: location ? 0.9 : 0.82,
    time_expression: timeExpression,
    schedule_note: "여행",
  };
}

function parseWorkScheduleIntent(
  message: string,
  referenceDate: string,
): ParsedEventIntent | null {
  if (!WORK_SCHEDULE.test(message) || MEAL.test(message)) {
    return null;
  }

  const extracted = buildExtractedDataFromText(message, referenceDate);
  const rawPlace =
    extracted.place_name ??
    resolveNavigationPlaceName(message) ??
    null;
  const place = isRealPlaceName(rawPlace) ? rawPlace : null;
  const timeExpression = extractRelativeTimeExpression(message);
  const datetime = extracted.datetime;
  const hasTemporal = Boolean(timeExpression || datetime || TIMED.test(message));

  if (!hasTemporal && !place) {
    return null;
  }

  const filled_slots: Partial<Record<CommitSlotName, string>> = {};
  const missing_slots: CommitSlotName[] = [];

  if (place) {
    filled_slots.place = place;
    filled_slots.location = place;
  } else if (hasTemporal) {
    missing_slots.push("place");
  }

  if (timeExpression) {
    filled_slots.datetime = timeExpression;
  } else if (datetime) {
    filled_slots.datetime = datetime;
  } else if (place) {
    missing_slots.push("datetime");
  }

  if (missing_slots.length === 0) {
    return null;
  }

  const primary_missing = pickPrimaryMissing(missing_slots);
  const scheduleNote = /(?:미팅|회의|meeting|interview)/iu.test(message)
    ? "미팅"
    : "일정";

  return {
    intent: WORK_SCHEDULE.test(message) && /(?:미팅|회의|meeting)/iu.test(message)
      ? "work"
      : "schedule",
    title: place ? `${place} ${scheduleNote}` : scheduleNote,
    filled_slots,
    missing_slots,
    primary_missing,
    clarify_mode: resolveClarifyMode("work", primary_missing),
    confidence: 0.8,
    time_expression: timeExpression,
    schedule_note: scheduleNote,
  };
}

function parseNavigateIntent(message: string): ParsedEventIntent | null {
  if (!NAVIGATE.test(message)) {
    return null;
  }

  const destination =
    resolveNavigationPlaceName(message) ??
    message.match(/([가-힣A-Za-z0-9]{2,12}역)/u)?.[1] ??
    null;

  if (destination) {
    return null;
  }

  const primary_missing: CommitSlotName = "location";

  return {
    intent: "navigate",
    title: "이동",
    filled_slots: {},
    missing_slots: ["location"],
    primary_missing,
    clarify_mode: "slot_collect",
    confidence: 0.78,
    time_expression: null,
    schedule_note: null,
  };
}

function parseMealIntent(message: string): ParsedEventIntent | null {
  if (!MEAL.test(message) || NAVIGATE.test(message) || WORK_SCHEDULE.test(message)) {
    return null;
  }

  const hasArea = /(?:근처|주변|동|구|시|역|제주|대전|서울|부산|강남|신림)/iu.test(message);
  if (hasArea) {
    return null;
  }

  return {
    intent: "meal",
    title: "식사",
    filled_slots: {},
    missing_slots: ["target"],
    primary_missing: "target",
    clarify_mode: "slot_collect",
    confidence: 0.75,
    time_expression: null,
    schedule_note: null,
  };
}

/** Rules-first event intent + slot frame (read path — no writes). */
export function parseEventIntent(input: {
  message: string;
  referenceDate?: string;
}): ParsedEventIntent | null {
  const message = input.message.trim();
  if (!message) {
    return null;
  }

  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);

  return (
    parseTravelIntent(message, referenceDate) ??
    parseWorkScheduleIntent(message, referenceDate) ??
    parseNavigateIntent(message) ??
    parseMealIntent(message)
  );
}

export function eventIntentKindLabel(intent: EventIntentKind): string {
  const labels: Record<EventIntentKind, string> = {
    travel: "여행",
    work: "업무",
    schedule: "일정",
    navigate: "이동",
    meal: "식사",
    unknown: "요청",
  };
  return labels[intent];
}
