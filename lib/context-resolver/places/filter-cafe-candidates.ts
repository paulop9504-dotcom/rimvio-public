import type { PlaceCandidate } from "@/lib/context-resolver/places/types";

/** Bakery-first chains — not diverse “coffee shop” picks when user asks for 카페. */
const BAKERY_BRAND =
  /성심당|파리바게|파리크라상|뚜레쥬르|던킨|베즐리|타르트\s*하우스|브레드\s*앤\s*co/i;

const COFFEE_SPECIALIST =
  /커피전문점|커피,|스타벅스|starbucks|이디야|ediya|투썸|twosome|할리스|hollys|컴포즈|compose|메가\s*mgc|메가커피|빽다방|paiks|카페\s*드롭|drop\s*top|텐퍼센트|tenpercent|블루보틀|blue\s*bottle|매머드|mammoth|더벤티|venti|공차(?!가)/iu;

const KNOWN_BRAND_KEYS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /성심당/i, key: "성심당" },
  { pattern: /스타벅스|starbucks/i, key: "스타벅스" },
  { pattern: /이디야|ediya/i, key: "이디야" },
  { pattern: /투썸|twosome|a\s*twosome/i, key: "투썸" },
  { pattern: /할리스|hollys/i, key: "할리스" },
  { pattern: /컴포즈|compose/i, key: "컴포즈" },
  { pattern: /메가\s*mgc|메가커피|megacoffee/i, key: "메가커피" },
  { pattern: /빽다방|paiks/i, key: "빽다방" },
  { pattern: /파리바게|paris\s*baguette/i, key: "파리바게뜨" },
  { pattern: /파리크라상/i, key: "파리크라상" },
  { pattern: /뚜레쥬르|tous\s*les/i, key: "뚜레쥬르" },
  { pattern: /카페\s*드롭|drop\s*top/i, key: "드롭탑" },
  { pattern: /텐퍼센트|tenpercent/i, key: "텐퍼센트" },
  { pattern: /공차(?!가)/i, key: "공차" },
];

const BRANCH_SUFFIX =
  /\s+(?:본점|지점|점|역점|DCC점|\d+호점|대전\s*역점|롯데백화점.*|백화점.*|아울렛.*|터미널.*|케익부띠끄|케이크부띠끄).*$/iu;

/** User wants coffee-shop style picks — not bakery tour. */
export function userWantsCoffeeShop(message: string): boolean {
  const trimmed = message.trim();
  if (!/(?:카페|커피|coffee)/iu.test(trimmed)) {
    return false;
  }
  if (/빵|베이커리|제과|성심당|케이크|마카롱|디저트\s*(?:만|위주)?/iu.test(trimmed)) {
    return false;
  }
  return true;
}

function placeHaystack(place: PlaceCandidate): string {
  return [place.name, place.naver_category, place.description].filter(Boolean).join(" ");
}

export function isBakeryHeavyCandidate(place: PlaceCandidate): boolean {
  const hay = placeHaystack(place);
  if (BAKERY_BRAND.test(place.name)) {
    return true;
  }
  if (/베이커리|제과|케이크/i.test(hay) && !/커피전문점/i.test(hay)) {
    return true;
  }
  return false;
}

export function isCoffeeSpecialistCandidate(place: PlaceCandidate): boolean {
  return COFFEE_SPECIALIST.test(placeHaystack(place));
}

export function extractBrandKey(name: string): string {
  const trimmed = name.trim();
  for (const entry of KNOWN_BRAND_KEYS) {
    if (entry.pattern.test(trimmed)) {
      return entry.key;
    }
  }
  const stripped = trimmed.replace(BRANCH_SUFFIX, "").trim();
  const first = stripped.split(/\s+/)[0] ?? stripped;
  return first.slice(0, 12) || trimmed.slice(0, 12);
}

function uniqueByPlaceId(candidates: PlaceCandidate[]): PlaceCandidate[] {
  const seen = new Set<string>();
  const out: PlaceCandidate[] = [];
  for (const candidate of candidates) {
    const id = candidate.place_id || candidate.name;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(candidate);
  }
  return out;
}

/** At most one branch per brand in top picks. */
export function diversifyCandidatesByBrand(
  candidates: PlaceCandidate[],
  limit: number,
  maxPerBrand = 1
): PlaceCandidate[] {
  const brandCounts = new Map<string, number>();
  const out: PlaceCandidate[] = [];

  for (const candidate of candidates) {
    const brand = extractBrandKey(candidate.name);
    const count = brandCounts.get(brand) ?? 0;
    if (count >= maxPerBrand) {
      continue;
    }
    brandCounts.set(brand, count + 1);
    out.push(candidate);
    if (out.length >= limit) {
      break;
    }
  }

  return out;
}

/**
 * Cafe discovery filter — coffee-shop intent deprioritizes bakery chains;
 * always diversify by brand (no five 성심당 branches).
 */
export function filterCafeCandidates(
  candidates: PlaceCandidate[],
  userMessage: string,
  limit = 5
): PlaceCandidate[] {
  if (candidates.length === 0) {
    return candidates;
  }

  const wantsCoffee = userWantsCoffeeShop(userMessage);
  let ordered = [...candidates];

  if (wantsCoffee) {
    const specialists = ordered.filter((place) => isCoffeeSpecialistCandidate(place));
    const nonBakery = ordered.filter(
      (place) => !isBakeryHeavyCandidate(place) && !isCoffeeSpecialistCandidate(place)
    );
    const bakery = ordered.filter(
      (place) => isBakeryHeavyCandidate(place) && !isCoffeeSpecialistCandidate(place)
    );

    ordered = uniqueByPlaceId([
      ...specialists,
      ...nonBakery,
      ...bakery.slice(0, 1),
    ]);
  }

  const diversified = diversifyCandidatesByBrand(ordered, limit, 1);

  if (diversified.length >= Math.min(3, limit)) {
    return diversified;
  }

  const backfill = diversifyCandidatesByBrand(
    uniqueByPlaceId([...diversified, ...ordered]),
    limit,
    wantsCoffee ? 1 : 2
  );
  return backfill;
}

export function assertCafeDiscoveryDiversity(
  names: readonly string[],
  userMessage: string
): { ok: boolean; reason?: string } {
  if (names.length === 0) {
    return { ok: false, reason: "empty options" };
  }

  const brands = names.map(extractBrandKey);
  const uniqueBrands = new Set(brands);
  if (names.length >= 3 && uniqueBrands.size < Math.min(3, names.length)) {
    return {
      ok: false,
      reason: `brand collapse: ${brands.join(", ")}`,
    };
  }

  if (userWantsCoffeeShop(userMessage)) {
    const bakeryCount = names.filter((name) => BAKERY_BRAND.test(name)).length;
    if (bakeryCount >= 3) {
      return {
        ok: false,
        reason: `too many bakery chains (${bakeryCount}/${names.length})`,
      };
    }
    const sungSimDang = names.filter((name) => /성심당/i.test(name)).length;
    if (sungSimDang >= 2) {
      return {
        ok: false,
        reason: `duplicate 성심당 branches (${sungSimDang})`,
      };
    }
  }

  return { ok: true };
}
