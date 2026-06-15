import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import { ACTION_CONTRACT_SLOTS } from "@/lib/event-kernel/action-contracts/action-contract-registry";
import { parseEntityFacetIntent } from "@/lib/context-resolver/discovery/parse-entity-facet-intent";
import { buildSemanticFrame } from "@/lib/search-intent/build-semantic-frame";

export type ExtractSlotsResult = {
  slots: Record<string, string>;
};

const NAVIGATE_HINT =
  /(?:길\s*찾|길찾기|길찾|가는\s*길|가\s*줘|가자|이동|출발|도착|까지|내비|네비|route|navigate|택시|버스|지하철)/iu;

const PRICE_HINT =
  /(?:가격|요금|비용|얼마|price|cost|메뉴\s*가격)/iu;

const WEATHER_HINT =
  /(?:날씨|weather|기온|강수|미세머지|체감\s*온도|비\s*올|눈\s*올)/iu;

const DAY_PREFIX = /^(?:오늘|내일|모레|이번\s*주|주말)\s*/iu;

const STATION_RE = /([가-힣A-Za-z0-9]{2,12}역)/u;
const AIRPORT_RE = /([가-힣A-Za-z0-9]{2,12}공항)/u;
const TERMINAL_RE = /([가-힣A-Za-z0-9]{2,8}터미널)/u;

const LEADING_DESTINATION =
  /^([가-힣A-Za-z0-9][가-힣A-Za-z0-9\s]{0,20}?(?:역|공항|터미널|점)?)\s*(?:가는\s*길|길\s*찾|까지\s*가|가\s*줘|가자)/iu;

const KOREAN_LOCATIONS = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "제주",
  "수원",
  "성남",
  "고양",
  "용인",
  "창원",
  "청주",
  "전주",
  "천안",
  "김해",
  "포항",
  "춘천",
  "강릉",
] as const;

function extractDestinationSlot(message: string): string | null {
  if (!NAVIGATE_HINT.test(message)) {
    return null;
  }

  const station = message.match(STATION_RE)?.[1];
  if (station) {
    return station;
  }

  const airport = message.match(AIRPORT_RE)?.[1];
  if (airport) {
    return airport;
  }

  const terminal = message.match(TERMINAL_RE)?.[1];
  if (terminal) {
    return terminal;
  }

  const leading = message.match(LEADING_DESTINATION)?.[1]?.trim();
  if (leading && leading.length >= 2) {
    return leading.replace(/\s+/g, " ").trim();
  }

  const until = message.match(
    /([가-힣A-Za-z0-9][가-힣A-Za-z0-9\s]{0,24}?(?:역|공항|터미널|점)?)\s*(?:까지|으로|로)/u
  )?.[1];
  if (until?.trim()) {
    return until.replace(/\s+/g, " ").trim();
  }

  const resolved = resolveNavigationPlaceName(message);
  if (!resolved || PRICE_HINT.test(resolved) || WEATHER_HINT.test(resolved)) {
    return null;
  }

  return resolved;
}

function extractEntitySlot(message: string): string | null {
  if (!PRICE_HINT.test(message)) {
    return null;
  }

  const facet = parseEntityFacetIntent(message);
  if (facet) {
    return facet.entity;
  }

  const inline = message.match(
    /^(.+?)\s*(?:가격|요금|비용|얼마|price|cost)/iu
  )?.[1];
  if (inline?.trim()) {
    const entity = inline.replace(/\s+/g, " ").trim();
    if (entity.length >= 2) {
      return entity;
    }
  }

  const frame = buildSemanticFrame({ text: message });
  if (frame.intent === "price_inquiry") {
    const candidates = [...frame.entities, ...frame.modifiers].filter(
      (part) => part.trim().length >= 2 && !PRICE_HINT.test(part)
    );
    if (candidates[0]) {
      return candidates[0].trim();
    }
  }

  return null;
}

function extractLocationSlot(message: string): string | null {
  if (!WEATHER_HINT.test(message)) {
    return null;
  }

  const stripped = message.replace(DAY_PREFIX, "").replace(/\s+/g, " ").trim();

  for (const city of KOREAN_LOCATIONS) {
    if (stripped.includes(city)) {
      return city;
    }
  }

  const inline = stripped.match(
    /([가-힣]{2,8})\s*(?:날씨|기온|weather)/iu
  )?.[1];
  if (inline && !/(?:오늘|내일|모레|주말)/u.test(inline)) {
    return inline.trim();
  }

  return null;
}

/**
 * Rules-first slot extraction for action contract validation.
 * Extraction only — no execution, no kernel writes.
 */
export function extractSlots(message: string): ExtractSlotsResult {
  const trimmed = message.trim();
  const slots: Record<string, string> = {};

  if (!trimmed) {
    return { slots };
  }

  const destination = extractDestinationSlot(trimmed);
  if (destination) {
    slots[ACTION_CONTRACT_SLOTS.destination] = destination;
  }

  const entity = extractEntitySlot(trimmed);
  if (entity) {
    slots[ACTION_CONTRACT_SLOTS.entity] = entity;
  }

  const location = extractLocationSlot(trimmed);
  if (location) {
    slots[ACTION_CONTRACT_SLOTS.location] = location;
  }

  return { slots };
}
