const BRAND_ENTITIES = [
  "쿠우쿠우",
  "스타벅스",
  "맥도날드",
  "이마트",
  "홈플러스",
  "코스트코",
  "올리브영",
  "CGV",
  "메가박스",
  "갤러리아",
  "롯데마트",
  "GS25",
  "CU",
  "세븐일레븐",
  "파리바게뜨",
  "뚜레쥬르",
  "버거킹",
  "KFC",
  "교촌치킨",
  "BHC",
  "네네치킨",
  "배달의민족",
  "쿠팡",
  "무신사",
  "29CM",
  "카카오",
  "네이버",
  "토스",
  "우버",
  "카카오T",
] as const;

const GEO_PREFIX =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/u;

const GEO_PAIR =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기)\s+(?:강남|강북|강서|강동|송파|마포|용산|서초|성동|성북|종로|중구|영등포|관악|노원|도봉|동대문|동작|은평|중랑|광진|구로|금천|양천|강남구|강북구|강서구|강동구|송파구|마포구|용산구|서초구|성동구|성북구|종로구|중구|영등포구|관악구|노원구|도봉구|동대문구|동작구|은평구|중랑구|광진구|구로구|금천구|양천구|해운대|수영|부산진|동래|연제|남구|북구|중구|달서|수성|달성|미추홀|연수|남동|부평|계양|서구|동구|광산|유성|대덕|울주|둔산|역삼|타임월드|센터시티|도안|월드컵|성수|홍대|이태원|명동|잠실|여의도|판교|분당|일산|수원|안양|성남|용인|고양|부천)/u;

const BRANCH_SUFFIX = /(?:점|지점|본점|직영점|역|공항|터미널)/u;

const STATION = /([가-힣A-Za-z0-9]{2,12}역)/u;
const AIRPORT = /([가-힣A-Za-z0-9]{2,12}공항)/u;

export type LockedEntity = {
  value: string;
  kind: "brand" | "geo" | "transit" | "branch";
  start: number;
  end: number;
};

function normalizeForScan(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function findBrandLocks(text: string): LockedEntity[] {
  const locks: LockedEntity[] = [];
  const lower = text.toLowerCase();

  for (const brand of BRAND_ENTITIES) {
    const idx = lower.indexOf(brand.toLowerCase());
    if (idx < 0) {
      continue;
    }

    let end = idx + brand.length;
    const after = text.slice(end);
    const branchMatch = after.match(/^\s*([가-힣A-Za-z0-9]{1,8}(?:점|지점|본점|직영점))/u);
    const value = branchMatch?.[1]
      ? `${text.slice(idx, end)} ${branchMatch[1]}`.replace(/\s+/g, " ").trim()
      : text.slice(idx, end);

    if (branchMatch?.[1]) {
      end += branchMatch[0].length;
    }

    locks.push({
      value,
      kind: branchMatch ? "branch" : "brand",
      start: idx,
      end,
    });
  }

  return locks;
}

function findGeoLocks(text: string): LockedEntity[] {
  const locks: LockedEntity[] = [];
  const pair = text.match(GEO_PAIR);
  if (pair?.[0]) {
    const idx = text.indexOf(pair[0]);
    locks.push({
      value: pair[0].replace(/\s+/g, " ").trim(),
      kind: "geo",
      start: idx,
      end: idx + pair[0].length,
    });
    return locks;
  }

  const prefix = text.match(new RegExp(`${GEO_PREFIX.source}\\s+[가-힣]{2,8}`, "u"));
  if (prefix?.[0]) {
    const idx = text.indexOf(prefix[0]);
    locks.push({
      value: prefix[0].replace(/\s+/g, " ").trim(),
      kind: "geo",
      start: idx,
      end: idx + prefix[0].length,
    });
  }

  return locks;
}

function findTransitLocks(text: string): LockedEntity[] {
  const locks: LockedEntity[] = [];
  for (const pattern of [STATION, AIRPORT]) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const idx = text.indexOf(match[1]);
      locks.push({
        value: match[1],
        kind: "transit",
        start: idx,
        end: idx + match[1].length,
      });
    }
  }
  return locks;
}

function overlaps(a: LockedEntity, b: LockedEntity) {
  return a.start < b.end && b.start < a.end;
}

/** Extract atomic entities — never split brand/geo/transit spans. */
export function lockEntities(text: string): LockedEntity[] {
  const normalized = normalizeForScan(text);
  if (!normalized) {
    return [];
  }

  const candidates = [
    ...findBrandLocks(normalized),
    ...findGeoLocks(normalized),
    ...findTransitLocks(normalized),
  ].sort((a, b) => a.start - b.start || b.end - a.end - (a.end - a.start));

  const picked: LockedEntity[] = [];
  for (const candidate of candidates) {
    if (picked.some((existing) => overlaps(existing, candidate))) {
      continue;
    }
    picked.push(candidate);
  }

  return picked.sort((a, b) => a.start - b.start);
}

export function entityValues(locks: LockedEntity[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const lock of locks) {
    const key = lock.value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(lock.value);
  }
  return out;
}

/** Remaining tokens after entity spans are removed — intent/modifier candidates. */
export function tokensOutsideEntities(text: string, locks: LockedEntity[]): string[] {
  if (locks.length === 0) {
    return text.split(/\s+/u).filter(Boolean);
  }

  const spans: string[] = [];
  let cursor = 0;
  for (const lock of locks) {
    if (lock.start > cursor) {
      spans.push(text.slice(cursor, lock.start));
    }
    cursor = lock.end;
  }
  if (cursor < text.length) {
    spans.push(text.slice(cursor));
  }

  return spans
    .join(" ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function allEntitiesPreserved(query: string, entities: string[]): boolean {
  const lower = query.toLowerCase();
  return entities.every((entity) => lower.includes(entity.toLowerCase()));
}
