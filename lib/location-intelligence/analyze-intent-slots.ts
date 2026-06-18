import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import { normalizeTimeFromText } from "@/lib/time/normalize-time";
import type { IntentKind, IntentSlotAnalysis, IntentSlotName } from "@/lib/location-intelligence/types";

const RESERVE =
  /예약|예약해|잡아|잡아줘|부킹|booking|reserve|헤어|미용|네일|병원|진료/u;
const NAVIGATE =
  /길찾|가\s*줘|가자|이동|출발|도착|까지|역\s*으로|역\s*로|택시|버스|지하철|route|navigate/u;
const SEARCH_PLACE =
  /추천|맛집|카페|놀\s*만|어디|근처|검색|찾아|find|recommend/u;
const SCHEDULE = /일정|캘린더|미팅|회의|remind|알림|스케줄/u;

const BRAND_OR_PLACE =
  /(?:갤러리아|스타벅스|헤어|미용실|병원|cgv|메가박스|이마트|홈플러스|올리브영)/iu;
const STATION = /([가-힣A-Za-z0-9]{2,12}역)/u;
const EXPLICIT_ADDRESS =
  /(?:특별시|광역시|시|군|구)\s+[가-힣0-9\s\-]+(?:로|길|번길|동로)\s*\d+/u;

function inferIntent(message: string): { intent: IntentKind; label: string } {
  const trimmed = message.trim();
  if (!trimmed) {
    return { intent: "unknown", label: "unknown" };
  }

  if (RESERVE.test(trimmed)) {
    return { intent: "reserve", label: "reserve" };
  }
  if (SEARCH_PLACE.test(trimmed) && !NAVIGATE.test(trimmed)) {
    return { intent: "search_place", label: "search_place" };
  }
  if (NAVIGATE.test(trimmed) || STATION.test(trimmed)) {
    return { intent: "navigate", label: "navigate" };
  }
  if (SCHEDULE.test(trimmed)) {
    return { intent: "schedule", label: "schedule" };
  }
  if (BRAND_OR_PLACE.test(trimmed)) {
    return { intent: "reserve", label: "reserve" };
  }

  return { intent: "unknown", label: "unknown" };
}

function readDestination(message: string): string | null {
  const station = message.match(STATION)?.[1];
  if (station) {
    return station;
  }

  const untilMatch = message.match(
    /(?:까지|으로|로)\s*([가-힣A-Za-z0-9\s]+(?:역|점|동|구|시|공항|터미널)?)/u
  );
  if (untilMatch?.[1]?.trim()) {
    return untilMatch[1].trim();
  }

  return resolveNavigationPlaceName(message);
}

function needsBranchConfirm(message: string, placeName: string | null): boolean {
  if (!placeName) {
    return false;
  }
  if (EXPLICIT_ADDRESS.test(message)) {
    return false;
  }
  if (STATION.test(placeName)) {
    return false;
  }
  return BRAND_OR_PLACE.test(message) || BRAND_OR_PLACE.test(placeName);
}

/** Stage 1 — rules-first intent + slot analysis (JSON wire for orchestrator / LLM). */
export function analyzeIntentSlots(input: {
  message: string;
  referenceDate?: string;
}): IntentSlotAnalysis {
  const message = input.message.trim();
  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const { intent, label } = inferIntent(message);

  const found_slots: Partial<Record<IntentSlotName, string>> = {};
  const missing_slots: IntentSlotName[] = [];

  const datetime = parseRelativeDateTimeFromText(message, referenceDate);
  if (datetime) {
    const isoTime = datetime.includes("T") ? datetime.slice(11, 16) : null;
    if (isoTime && /^\d{2}:\d{2}$/.test(isoTime)) {
      found_slots.time = isoTime;
    }
    found_slots.date = datetime.slice(0, 10);
  }

  const normalized = normalizeTimeFromText(message);
  if (normalized && !found_slots.time) {
    found_slots.time = normalized.clock;
  }

  const destination = readDestination(message);
  const placeName = resolveNavigationPlaceName(message) ?? destination;

  if (placeName) {
    found_slots.place_name = placeName;
  }
  if (destination) {
    found_slots.destination = destination;
  }

  const phoneMatch = message.match(/(?:010|011|016|017|018|019)[-\s]?\d{3,4}[-\s]?\d{4}/);
  if (phoneMatch) {
    found_slots.contact = phoneMatch[0]!;
  }

  if (intent === "reserve" || intent === "schedule") {
    if (!datetime && /예약|일정|미팅|회의|헤어|미용/u.test(message)) {
      missing_slots.push("time");
    }
    if (!placeName && /헤어|미용|병원|갤러리아|스타벅스|예약/u.test(message)) {
      missing_slots.push("place_name");
    }
    if (needsBranchConfirm(message, placeName)) {
      missing_slots.push("branch");
    }
  }

  if (intent === "navigate") {
    if (!destination && !placeName) {
      missing_slots.push("destination");
    }
    if (!/(?:에서|출발|집|현재\s*위치|유성|둔산|강남)/u.test(message)) {
      missing_slots.push("origin");
    }
  }

  if (intent === "search_place") {
    if (!/(?:근처|주변|동|구|시|역|제주|대전|서울|부산)/u.test(message)) {
      missing_slots.push("place_name");
    }
  }

  let confidence = 0.72;
  if (intent !== "unknown") {
    confidence += 0.12;
  }
  if (Object.keys(found_slots).length >= 2) {
    confidence += 0.08;
  }
  if (missing_slots.length === 0) {
    confidence += 0.06;
  }

  return {
    intent,
    intent_label: label,
    missing_slots,
    found_slots,
    confidence: Math.min(confidence, 0.96),
  };
}

export function formatIntentSlotAnalysisBlock(analysis: IntentSlotAnalysis): string {
  return [
    "# [INTENT_SLOT_ANALYSIS]",
    "Stage 1 — rules engine output (use before answering):",
    JSON.stringify(
      {
        intent: analysis.intent_label,
        missing_slots: analysis.missing_slots,
        found_slots: analysis.found_slots,
      },
      null,
      2
    ),
    "[지침]",
    "- missing_slots가 있으면 완료 보고 대신 확인·버튼·검색 wire를 우선하라.",
    "- branch 누락 시 rules place-confirm 파이프라인이 후보 버튼을 제공한다.",
  ].join("\n");
}
