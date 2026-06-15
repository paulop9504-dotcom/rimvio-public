import { extractPlaceEntities } from "@/lib/action-chat/clean-entity-text";
import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";

export type ParsedManualContextPlace = {
  raw: string;
  /** User-facing short label — e.g. 신림동 */
  displayLabel: string;
  /** Geocode search query — e.g. 서울 신림동 */
  searchQuery: string;
};

const MEETING_PREFIX =
  /^(?:약속\s*(?:장소|장소는)?|만날\s*장소|만남\s*장소|장소)\s*/iu;
const MEETING_SUFFIX =
  /\s*(?:에서|에|로)\s*(?:만나(?:자|요|요\?|기|볼까)?|봐(?:요|자|요\?)?|기다릴게|가자|갈게|할게|하자)\s*$/iu;
const TRAILING_PARTICLES = /(?:에서|에|로|까지)\s*$/u;

const DONG_TOKEN = /([가-힣A-Za-z0-9]{2,12}동)/u;
const STATION_TOKEN = /([가-힣A-Za-z0-9]{2,12}역)/u;
const CITY_TOKEN =
  /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/u;

const SEOUL_METRO_DONG =
  /^(?:신림|봉천|서초|방배|사당|노량진|대학|상도|흑석|관악|신대방|구로|가산|독산|금천|영등포|여의도|당산|합정|망원|연남|성수|건대|잠실|송파|강남|역삼|선릉|삼성|대치|도곡|압구정|신사|논현|이태원|한남|광화문|종로|을지로|명동|회기|외대|망우|상봉|중랑|면목|용마|중곡|군자|자양|구의|자곡|일원|수서|세곡|개포|청담|신정|목동|양천|오목|화곡|등촌|염창|가양|마곡|발산|우장|공항|방화|화곡|응암|불광|수색|녹번|홍제|남가좌|북가좌|신촌|연희|대현|창천|신수|서강)동$/u;

function stripMeetingNoise(text: string): string {
  return text
    .replace(MEETING_PREFIX, "")
    .replace(MEETING_SUFFIX, "")
    .replace(TRAILING_PARTICLES, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDisplayLabel(input: {
  cleaned: string;
  dong: string | null;
  station: string | null;
  entityName: string | null;
}): string {
  if (input.dong) {
    return input.dong;
  }
  if (input.station) {
    return input.station;
  }
  if (input.entityName?.trim()) {
    return input.entityName.trim();
  }
  const nav = resolveNavigationPlaceName(input.cleaned);
  if (nav?.trim()) {
    return nav.trim();
  }
  return input.cleaned.trim();
}

function buildSearchQuery(input: {
  raw: string;
  cleaned: string;
  displayLabel: string;
  dong: string | null;
  station: string | null;
  city: string | null;
  addressDisplay: string | null;
}): string {
  if (input.addressDisplay?.trim()) {
    return input.addressDisplay.trim();
  }

  const city = input.city;
  const label = input.displayLabel;

  if (city && label) {
    if (label.includes(city)) {
      return label;
    }
    return `${city} ${label}`.trim();
  }

  if (input.dong && SEOUL_METRO_DONG.test(input.dong)) {
    return `서울 ${input.dong}`;
  }

  if (input.station && !city) {
    return `서울 ${input.station}`;
  }

  if (input.dong && !city) {
    return `서울 ${input.dong}`;
  }

  const nav = resolveNavigationPlaceName(input.raw);
  if (nav?.trim()) {
    return nav.trim();
  }

  return label || input.cleaned;
}

/** Natural language place → geocode query. e.g. 「약속장소 신림동에서 만나자」→ 서울 신림동 */
export function parseManualContextPlaceText(raw: string): ParsedManualContextPlace {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { raw: "", displayLabel: "", searchQuery: "" };
  }

  const overseas = classifyOverseasManualPlace(trimmed);
  if (overseas) {
    return {
      raw: trimmed,
      displayLabel: overseas.label,
      searchQuery: overseas.geocodeQuery,
    };
  }

  const cleaned = stripMeetingNoise(trimmed);
  const entities = extractPlaceEntities(trimmed);
  const dong = cleaned.match(DONG_TOKEN)?.[1] ?? trimmed.match(DONG_TOKEN)?.[1] ?? null;
  const station =
    cleaned.match(STATION_TOKEN)?.[1] ?? trimmed.match(STATION_TOKEN)?.[1] ?? null;
  const city =
    cleaned.match(CITY_TOKEN)?.[1] ?? trimmed.match(CITY_TOKEN)?.[1] ?? null;

  const entityName = [entities.name, entities.branch].filter(Boolean).join(" ").trim() || null;
  const displayLabel = buildDisplayLabel({
    cleaned,
    dong,
    station,
    entityName,
  });
  const searchQuery = buildSearchQuery({
    raw: trimmed,
    cleaned,
    displayLabel,
    dong,
    station,
    city,
    addressDisplay: entities.address?.display ?? null,
  });

  return {
    raw: trimmed,
    displayLabel: displayLabel || trimmed,
    searchQuery: searchQuery || displayLabel || trimmed,
  };
}
