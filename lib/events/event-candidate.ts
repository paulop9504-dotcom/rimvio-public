import { parseAbsoluteTimeFromText } from "@/lib/time-decision/parse-absolute-time";
import { extractTaskLabelFromMessage } from "@/lib/time-decision/extract-task-label";
import { resolveTemporalExpression } from "@/lib/time/temporal-resolver";
import { initialLifecycle, scoreEventConfidence } from "@/lib/events/event-lifecycle";
import type {
  LockedEventCategory,
  LockedEventLifecycle,
  LockedEventSource,
} from "@/lib/event-kernel/schema-lock/event-schema";

/** Schema-locked — see `lib/event-kernel/schema-lock/event-schema.ts`. */
export type EventCandidateCategory = LockedEventCategory;
export type EventCandidateSource = LockedEventSource;
export type EventCandidateLifecycle = LockedEventLifecycle;

/**
 * Canonical reality layer — Rimvio SSOT for detected life events.
 * Feed "Experience" nodes map 1:1 here, enriched with `feedCaptures` metadata
 * and plan context — no separate Experience schema. Goals/tasks surface as
 * in-node Actions only.
 */
export type EventCandidate = {
  id: string;
  title: string;
  category: EventCandidateCategory;
  source: EventCandidateSource;
  lifecycle: EventCandidateLifecycle;
  datetime?: string;
  place?: string;
  containerId?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
  lifecycleUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EventCandidateDraft = Omit<
  EventCandidate,
  "id" | "lifecycleUpdatedAt" | "createdAt" | "updatedAt"
>;

/** API wire — client persists via commitEventWireFromApi (`lib/source-of-truth/commit-truth`). */
export type EventCandidateWire = {
  id: string;
  title: string;
  category: EventCandidateCategory;
  source: EventCandidateSource;
  lifecycle: EventCandidateLifecycle;
  datetime?: string;
  place?: string;
  container_id?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
  lifecycle_updated_at?: string;
};

export type EventCandidateUpsertInput = EventCandidateDraft & {
  id?: string;
};

const SCHEDULE_SIGNAL =
  /(?:일정|약속|예약|미팅|회의|치과|병원|내일|모레|오늘|\d{1,2}\s*시|\d{1,2}:\d{2})/u;
const SOCIAL_SIGNAL =
  /(?:생신|생일|기념일|결혼|돌잔치|칠순|환갑|축하|명절|생파|잔치|모임|만나|약속)/u;
const FINANCE_SIGNAL =
  /(?:비트코인|btc|eth|주식|숏|롱|매수|매도|코인|환율|투자|선물|알림|alert)/iu;
const FINANCE_ALERT_SIGNAL =
  /(?:비트코인|btc|eth|주식|코인).*(?:오면|도달|터치|되면|넘으면|빠지면)/iu;
const TRAVEL_SIGNAL = /(?:공항|항공|여행|출장|탑승|비행|체크인|탑승권)/iu;
const FOOD_SIGNAL = /(?:맛집|식당|카페|치킨|저녁|점심|배달|먹)/u;
const WORK_SIGNAL = /(?:업무|보고|출근|deadline|마감|보고서|미팅)/iu;
const CONTACT_SIGNAL = /(?:전화|연락|통화)/u;

const PLACE_HINT =
  /(?:치과|병원|미용|헤어|카페|식당|역|센터|[가-힣]{2,8}역)/u;

function detectCategory(message: string): EventCandidateCategory {
  if (FINANCE_SIGNAL.test(message)) {
    return "finance";
  }
  if (SOCIAL_SIGNAL.test(message)) {
    return "social";
  }
  if (TRAVEL_SIGNAL.test(message)) {
    return "travel";
  }
  if (FOOD_SIGNAL.test(message)) {
    return "food";
  }
  if (WORK_SIGNAL.test(message)) {
    return "work";
  }
  if (SCHEDULE_SIGNAL.test(message)) {
    return "schedule";
  }
  if (CONTACT_SIGNAL.test(message)) {
    return "social";
  }
  return "custom";
}

function hasEventSignal(message: string): boolean {
  return (
    SCHEDULE_SIGNAL.test(message) ||
    SOCIAL_SIGNAL.test(message) ||
    FINANCE_SIGNAL.test(message) ||
    FINANCE_ALERT_SIGNAL.test(message) ||
    TRAVEL_SIGNAL.test(message) ||
    FOOD_SIGNAL.test(message) ||
    WORK_SIGNAL.test(message) ||
    CONTACT_SIGNAL.test(message)
  );
}

function extractTitle(message: string, category: EventCandidateCategory): string {
  if (category === "finance") {
    if (FINANCE_ALERT_SIGNAL.test(message)) {
      return "BTC Alert";
    }
    if (/(?:비트코인|btc)/iu.test(message) && /숏/u.test(message)) {
      return "BTC 숏";
    }
    if (/(?:비트코인|btc)/iu.test(message) && /롱/u.test(message)) {
      return "BTC 롱";
    }
    const asset = message.match(/(?:비트코인|btc|eth|주식|코인)/iu)?.[0];
    if (asset) {
      return asset.toUpperCase().replace("비트코인", "BTC");
    }
  }

  if (category === "social") {
    const birthday = message.match(/([가-힣]{2,8})\s*(?:생신|생일)/u);
    if (birthday?.[1]) {
      return `${birthday[1]} ${message.includes("생신") ? "생신" : "생일"}`;
    }
    const namedCall = message.match(/([가-힣]{2,8})\s*(?:한테\s*)?전화/u);
    if (namedCall?.[1]) {
      return `${namedCall[1]} 전화`;
    }
  }

  const placeMatch = message.match(PLACE_HINT);
  if (placeMatch?.[0]) {
    return placeMatch[0].trim();
  }

  const label = extractTaskLabelFromMessage(message);
  return label.length >= 2 ? label.slice(0, 48) : "일정";
}

function extractPlace(message: string, title: string): string | undefined {
  const place = message.match(PLACE_HINT)?.[0]?.trim();
  if (!place) {
    return undefined;
  }
  return title === place ? place : place;
}

function buildMetadata(message: string, category: EventCandidateCategory): Record<string, unknown> {
  const metadata: Record<string, unknown> = { sourceMessage: message };
  if (category === "finance" && FINANCE_ALERT_SIGNAL.test(message)) {
    metadata.alert = true;
  }
  return metadata;
}

/** Deterministic event detection — every orchestrator request runs this first. */
export function detectEventCandidate(input: {
  message: string;
  referenceDate: string;
  source?: EventCandidateSource;
  containerId?: string | null;
  now?: Date;
}): EventCandidateDraft | null {
  const message = input.message.trim();
  if (!message || message.length > 400 || !hasEventSignal(message)) {
    return null;
  }

  const category = detectCategory(message);
  const temporal = resolveTemporalExpression({
    message,
    referenceDate: input.referenceDate,
  });
  const absolute = temporal
    ? null
    : parseAbsoluteTimeFromText({
        message,
        referenceDate: input.referenceDate,
        now: input.now,
      });
  const datetime = temporal?.iso ?? absolute?.iso ?? undefined;

  const title = extractTitle(message, category);
  const place = extractPlace(message, title);

  return {
    title,
    category,
    source: input.source ?? "message",
    lifecycle: initialLifecycle(),
    datetime,
    place,
    containerId: input.containerId ?? undefined,
    confidence: scoreEventConfidence({ category, datetime, place }),
    metadata: buildMetadata(message, category),
  };
}
