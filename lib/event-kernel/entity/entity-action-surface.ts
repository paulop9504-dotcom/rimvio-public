import { buildSemanticFrame } from "@/lib/search-intent/build-semantic-frame";
import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import { isVitalityStateUtterance } from "@/lib/vitality-state/classify-vitality-state-intent";
import { isAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { lookupKnownEntity } from "@/lib/event-kernel/entity/known-entity-catalog";
import type {
  ActionBucket,
  EntityActionSurfaceWire,
  EntityActionSuggestion,
  EntityInputState,
  EntityOnlyDetection,
  EntityType,
  EntityTypeGuess,
} from "@/lib/event-kernel/entity/entity-action-surface-types";

const MAX_ENTITY_ONLY_LEN = 32;

const CONTINUATION =
  /^(?:응|네|넵|예|ㅇㅇ|ㅇ|ok|okay|yes|yep|고마워|감사|알겠|그래|좋아|continue|cont)$/iu;

const FILLER_ONLY =
  /^(?:음\.?\.?|어\.?\.?|흠\.?\.?|글쎄\.?\.?|음음|어어)$/iu;

const EXPLICIT_INTENT =
  /(?:가격|요금|얼마|영업\s*시간|영업시간|예약|길찾|네비|맛집|추천|찾아|검색|리뷰|후기|뉴스|채용|제품|메뉴|전화|문의|지원|비교|구매|주문)/u;

/** Productivity / schedule-organize phrases — not bare entities. */
const PRODUCTIVITY_INTENT =
  /(?:일정|스케줄|계획)\s*(?:정리|정돈)|(?:정리|정돈)\s*해\s*줘|스케줄\s*정리|일정\s*정리|일정\s*정돈|계획\s*정리|여행\s*일정|일정\s*짜/iu;

/** Shopping / purchase need — not a brand entity (e.g. "옷사야함"). */
const SHOPPING_INTENT =
  /(?:옷|의류|신발|가방|패션|코디|쇼핑|장보).*(?:사|살|구매|추천)|(?:사야(?:함|요|)|살\s*거|구매\s*(?:해야|할)).{0,8}(?:옷|의류|신발)?|옷\s*사(?:야|야함|을)/iu;

const ACTIONABLE_ATTRIBUTE =
  /(?:https?:\/\/|\d{2,3}-\d{3,4}-\d{4}|\d{1,2}\s*시|내일|모레|오늘|\d+\s*월)/u;

const RESTAURANT_HINT =
  /(?:쿠우쿠우|스타벅스|맥도날드|버거킹|롯데리아|이디야|투썸|배스킨|파리바게뜨|뚜레쥬르|본죽|설빙|교촌|bhc|bbq|치킨|뷔페|식당|레스토랑)/iu;

const COMPANY_HINT =
  /(?:삼성전자|삼성|lg전자|lg|현대|sk|네이버|카카오|쿠팡|전자|그룹|홀딩스|corp|inc|co\.|ltd)/iu;

const PRODUCT_HINT =
  /(?:아이폰|iphone|갤럭시|galaxy|ipad|맥북|macbook|에어팟|airpods|프로\s*\d|mini\s*\d)/iu;

const SOFTWARE_HINT =
  /(?:유튜브|youtube|인스타|instagram|카카오톡|네이버|구글|google|microsoft|엑셀|ppt|notion|slack|zoom)/iu;

const EVENT_HINT = /(?:올림픽|월드컵|페스티벌|축제|콘서트|전시회|박람회)/iu;

const PLACE_HINT =
  /(?:역|공항|터미널|박물관|미술관|공원|타워|센터|몰|마트|백화점|시장)$/iu;

const PERSON_HINT =
  /(?:이재용|일론|머스크|손흥민|뉴진스|bts|방탄)/iu;

const BUCKET_ORDER: ActionBucket[] = [
  "PRICE",
  "LOCATION",
  "HOURS",
  "RESERVATION",
  "NEWS",
  "PRODUCTS",
  "CAREERS",
  "INFO",
  "SUPPORT",
  "CONTACT",
];

const TYPE_BUCKETS: Record<EntityType, ActionBucket[]> = {
  RESTAURANT: ["PRICE", "LOCATION", "HOURS", "RESERVATION", "INFO"],
  COMPANY: ["NEWS", "PRODUCTS", "CAREERS", "INFO"],
  BRAND: ["LOCATION", "HOURS", "PRICE", "INFO", "RESERVATION"],
  PRODUCT: ["PRICE", "INFO", "SUPPORT"],
  PLACE: ["LOCATION", "HOURS", "INFO"],
  PERSON: ["INFO", "NEWS"],
  SOFTWARE: ["INFO", "SUPPORT"],
  EVENT: ["INFO", "NEWS"],
  UNKNOWN: ["INFO"],
};

function normalizeEntityToken(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function extractEntityToken(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const fromNav = resolveNavigationPlaceName(trimmed);
  if (fromNav && normalizeEntityToken(trimmed) === normalizeEntityToken(fromNav)) {
    return fromNav;
  }

  const frame = buildSemanticFrame({ text: trimmed });
  const candidates = [...frame.entities, ...frame.modifiers].filter(
    (part) => part.trim().length >= 2 && !EXPLICIT_INTENT.test(part)
  );

  if (candidates.length === 1) {
    return candidates[0]!.trim();
  }

  if (
    candidates.length === 0 &&
    trimmed.length >= 2 &&
    trimmed.length <= MAX_ENTITY_ONLY_LEN &&
    !FILLER_ONLY.test(trimmed)
  ) {
    if (
      !EXPLICIT_INTENT.test(trimmed) &&
      !/\s{2,}/.test(trimmed) &&
      /[가-힣A-Za-z0-9]{2,}/u.test(trimmed)
    ) {
      return trimmed;
    }
  }

  const joined = candidates.join(" ").trim();
  if (joined && normalizeEntityToken(joined) === normalizeEntityToken(trimmed)) {
    return joined;
  }

  return null;
}

/** ENTITY_ONLY — entity present, no explicit intent, no actionable attribute, no continuation. */
export function detectEntityOnlyInput(message: string): EntityOnlyDetection | null {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > MAX_ENTITY_ONLY_LEN) {
    return null;
  }

  if (CONTINUATION.test(trimmed) || FILLER_ONLY.test(trimmed)) {
    return null;
  }

  if (isVitalityStateUtterance(trimmed)) {
    return null;
  }

  if (isAiIntentUtterance(trimmed)) {
    return null;
  }

  if (
    EXPLICIT_INTENT.test(trimmed) ||
    ACTIONABLE_ATTRIBUTE.test(trimmed) ||
    PRODUCTIVITY_INTENT.test(trimmed) ||
    SHOPPING_INTENT.test(trimmed)
  ) {
    return null;
  }

  const entity = extractEntityToken(trimmed);
  if (!entity) {
    return null;
  }

  if (normalizeEntityToken(trimmed) !== normalizeEntityToken(entity)) {
    return null;
  }

  return { state: "ENTITY_ONLY", entity };
}

export function classifyEntityInputState(message: string): EntityInputState {
  return detectEntityOnlyInput(message) ? "ENTITY_ONLY" : "NOT_ENTITY_ONLY";
}

/** Heuristic type guess — not persisted, not authoritative. */
export function guessEntityType(entity: string): EntityTypeGuess {
  const hay = entity.trim();
  const lower = hay.toLowerCase();

  const known = lookupKnownEntity(hay);
  if (known) {
    return known;
  }

  if (RESTAURANT_HINT.test(hay)) {
    return { entity: hay, entityType: "RESTAURANT", confidence: 0.88 };
  }
  if (PRODUCT_HINT.test(hay)) {
    return { entity: hay, entityType: "PRODUCT", confidence: 0.86 };
  }
  if (COMPANY_HINT.test(hay)) {
    return { entity: hay, entityType: "COMPANY", confidence: 0.84 };
  }
  if (SOFTWARE_HINT.test(hay)) {
    return { entity: hay, entityType: "SOFTWARE", confidence: 0.82 };
  }
  if (EVENT_HINT.test(hay)) {
    return { entity: hay, entityType: "EVENT", confidence: 0.8 };
  }
  if (PERSON_HINT.test(hay)) {
    return { entity: hay, entityType: "PERSON", confidence: 0.78 };
  }
  if (PLACE_HINT.test(hay)) {
    return { entity: hay, entityType: "PLACE", confidence: 0.76 };
  }

  if (/(?:카페|coffee)/iu.test(hay)) {
    return { entity: hay, entityType: "BRAND", confidence: 0.72 };
  }

  if (/[A-Za-z]{2,}/.test(hay) && hay.length <= 16 && !COMPANY_HINT.test(hay)) {
    return { entity: hay, entityType: "BRAND", confidence: 0.55 };
  }

  if (lower.endsWith("전자") || lower.includes("group")) {
    return { entity: hay, entityType: "COMPANY", confidence: 0.7 };
  }

  return { entity: hay, entityType: "UNKNOWN", confidence: 0.45 };
}

function bucketLabel(bucket: ActionBucket, entityType: EntityType): string {
  if (bucket === "INFO" && entityType === "RESTAURANT") {
    return "메뉴";
  }
  switch (bucket) {
    case "PRICE":
      return "가격";
    case "LOCATION":
      return "매장 찾기";
    case "HOURS":
      return "영업시간";
    case "RESERVATION":
      return "예약";
    case "NEWS":
      return "최신 뉴스";
    case "PRODUCTS":
      return "제품 정보";
    case "CAREERS":
      return "채용";
    case "INFO":
      return entityType === "COMPANY" ? "기업 정보" : "정보";
    case "SUPPORT":
      return "고객지원";
    case "CONTACT":
      return "문의";
    default:
      return "정보";
  }
}

function bucketPrompt(entity: string, bucket: ActionBucket, entityType: EntityType): string {
  const label = bucketLabel(bucket, entityType);
  if (bucket === "LOCATION" && (entityType === "RESTAURANT" || entityType === "BRAND")) {
    return `${entity} 맛집 추천`;
  }
  return `${entity} ${label.replace(/\s+/g, " ")}`;
}

export function bucketsForEntityType(entityType: EntityType): ActionBucket[] {
  const mapped = TYPE_BUCKETS[entityType] ?? TYPE_BUCKETS.UNKNOWN;
  return mapped.slice(0, 5);
}

export function buildEntityActionSuggestions(input: {
  entity: string;
  entityType: EntityType;
  limit?: number;
}): EntityActionSuggestion[] {
  const buckets = bucketsForEntityType(input.entityType);
  const limit = Math.min(5, Math.max(3, input.limit ?? 5));

  return buckets.slice(0, limit).map((bucket, index) => ({
    id: `${bucket.toLowerCase()}_${index}`,
    bucket,
    label: bucketLabel(bucket, input.entityType),
    prompt: bucketPrompt(input.entity, bucket, input.entityType),
  }));
}

export function buildEntityActionSurface(message: string): EntityActionSurfaceWire | null {
  const detection = detectEntityOnlyInput(message);
  if (!detection) {
    return null;
  }

  const guess = guessEntityType(detection.entity);
  const suggestions = buildEntityActionSuggestions({
    entity: guess.entity,
    entityType: guess.entityType,
  });

  return {
    state: "ENTITY_ONLY",
    entity: guess.entity,
    entityType: guess.entityType,
    confidence: guess.confidence,
    lead:
      guess.entityType === "COMPANY"
        ? `${guess.entity} — 뉴스, 제품, 채용 중에서 골라보세요.`
        : guess.entityType === "RESTAURANT" || guess.entityType === "BRAND"
          ? `${guess.entity} — 메뉴, 매장, 영업시간 중에서 골라보세요.`
          : `${guess.entity} 관련해서 많이 찾는 정보입니다.`,
    suggestions,
  };
}

/** Rank buckets for tests / introspection. */
export function rankBucketsForGuess(guess: EntityTypeGuess): ActionBucket[] {
  return bucketsForEntityType(guess.entityType);
}
