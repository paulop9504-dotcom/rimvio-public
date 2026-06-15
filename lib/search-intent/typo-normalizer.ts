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

const GEO_TOKENS = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강남",
  "강북",
  "역삼",
  "둔산",
  "성수",
  "홍대",
  "잠실",
  "판교",
  "분당",
  "수원",
  "안양",
  "성남",
  "고양",
  "부천",
  "도안",
  "타임월드",
  "센터시티",
  "월드컵",
] as const;

const CATEGORY_TOKENS = ["맛집", "카페", "식당", "뷔페", "술집", "치킨", "피자", "마트"] as const;

export type TypoCorrection = {
  from: string;
  to: string;
  confidence: number;
  kind: "repeat" | "spacing" | "fuzzy_entity" | "category_typo";
};

export type TypoNormalizationResult = {
  normalized: string;
  corrections: TypoCorrection[];
};

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j < cols; j += 1) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }

  return matrix[a.length]![b.length]!;
}

function similarity(a: string, b: string): number {
  if (!a || !b) {
    return 0;
  }
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

function collapseRepeatedChars(text: string): { value: string; corrected: boolean } {
  const collapsed = text.replace(/(.)\1{2,}/gu, "$1$1");
  return { value: collapsed, corrected: collapsed !== text };
}

function restoreGeoCategorySpacing(text: string): { value: string; corrections: TypoCorrection[] } {
  let value = text;
  const corrections: TypoCorrection[] = [];

  for (const geo of GEO_TOKENS) {
    for (const category of CATEGORY_TOKENS) {
      const glued = `${geo}${category}`;
      const typo = new RegExp(`${geo}[\\s]*${category.slice(0, 2)}[\\s]*${category.slice(2)}`, "iu");
      const typoAlt = new RegExp(`${geo}(?:마|맛)(?:집|jp)`, "iu");

      if (value.includes(glued)) {
        const next = value.replace(glued, `${geo} ${category}`);
        if (next !== value) {
          corrections.push({ from: glued, to: `${geo} ${category}`, confidence: 0.92, kind: "spacing" });
          value = next;
        }
      }

      const typoMatch = value.match(typoAlt);
      if (typoMatch?.[0]) {
        const next = value.replace(typoMatch[0], `${geo} ${category}`);
        corrections.push({
          from: typoMatch[0],
          to: `${geo} ${category}`,
          confidence: 0.86,
          kind: "category_typo",
        });
        value = next;
      }

      if (typo.test(value)) {
        const match = value.match(typo)?.[0];
        if (match) {
          const next = value.replace(match, `${geo} ${category}`);
          corrections.push({
            from: match,
            to: `${geo} ${category}`,
            confidence: 0.84,
            kind: "category_typo",
          });
          value = next;
        }
      }
    }
  }

  return { value, corrections };
}

function fuzzyEntityRepair(text: string): { value: string; corrections: TypoCorrection[] } {
  const tokens = text.split(/\s+/u).filter(Boolean);
  const corrections: TypoCorrection[] = [];
  const nextTokens = tokens.map((token) => {
    let best: { entity: string; score: number } | null = null;

    for (const entity of BRAND_ENTITIES) {
      const score = similarity(token, entity);
      if (score >= 0.72 && (!best || score > best.score)) {
        best = { entity, score };
      }
    }

    if (best && best.score >= 0.72 && token.toLowerCase() !== best.entity.toLowerCase()) {
      corrections.push({
        from: token,
        to: best.entity,
        confidence: best.score,
        kind: "fuzzy_entity",
      });
      return best.entity;
    }

    return token;
  });

  return { value: nextTokens.join(" "), corrections };
}

/** Input canonicalization — intent hypothesis first, then entity alignment. */
export function normalizeTypoInput(raw: string): TypoNormalizationResult {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return { normalized: "", corrections: [] };
  }

  const corrections: TypoCorrection[] = [];
  const repeated = collapseRepeatedChars(trimmed);
  if (repeated.corrected) {
    corrections.push({
      from: trimmed,
      to: repeated.value,
      confidence: 0.7,
      kind: "repeat",
    });
  }

  const spaced = restoreGeoCategorySpacing(repeated.value);
  corrections.push(...spaced.corrections);

  const fuzzy = fuzzyEntityRepair(spaced.value);
  corrections.push(...fuzzy.corrections);

  return {
    normalized: fuzzy.value.replace(/\s+/g, " ").trim(),
    corrections,
  };
}

export function isTypoCase(input: {
  raw: string;
  normalized: string;
  corrections: TypoCorrection[];
}): boolean {
  if (input.corrections.length === 0) {
    return false;
  }
  const maxConfidence = Math.max(...input.corrections.map((entry) => entry.confidence));
  const entitySimilarity = similarity(input.raw, input.normalized);
  return maxConfidence >= 0.72 || entitySimilarity >= 0.8;
}

export function isIntentShiftCase(input: {
  raw: string;
  normalized: string;
}): boolean {
  return similarity(input.raw, input.normalized) < 0.55;
}

export { BRAND_ENTITIES, GEO_TOKENS, CATEGORY_TOKENS, similarity };
