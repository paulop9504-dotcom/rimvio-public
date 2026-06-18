import { listLifeDomainKeys, LIFE_DOMAIN_BY_KEY } from "@/lib/life-domain-actions/catalog";
import type { LifeDomainKey } from "@/lib/life-domain-actions/types";

const DOMAIN_PATTERNS: Array<{ domain: LifeDomainKey; pattern: RegExp }> = [
  {
    domain: "study",
    pattern:
      /(?:학습|공부|스터디|시험|논문|강의|오답|집중\s*모드|study|exam|lecture|todo\s*study)/iu,
  },
  {
    domain: "work",
    pattern:
      /(?:업무|회의|미팅|브리핑|칸반|보고서|기획서|work|meeting|briefing|kanban|office)/iu,
  },
  {
    domain: "travel",
    pattern:
      /(?:여행|출장|항공|숙소|관광|travel|trip|abroad|boarding|체크인|환율|번역)/iu,
  },
  {
    domain: "health",
    pattern:
      /(?:건강|운동|헬스|식단|칼로리|수면|영양제|약\s*복용|health|workout|meditation|러닝)/iu,
  },
  {
    domain: "finance",
    pattern:
      /(?:금융|자산|지출|예산|송금|주식|암호화폐|가계부|구독료|finance|budget|savings|청구서)/iu,
  },
  {
    domain: "relationship",
    pattern:
      /(?:관계|소통|기념일|선물|약속|청첩장|더치페이|안부|relationship|anniversary|invite)/iu,
  },
  {
    domain: "daily_life",
    pattern:
      /(?:일상|생활|날씨|미세먼지|배달|장보기|분리수거|배송|스마트홈|주차|ott|daily\s*life)/iu,
  },
];

const EXPLICIT_DOMAIN: Array<{ domain: LifeDomainKey; pattern: RegExp }> = [
  { domain: "study", pattern: /\b(?:study|학습)\b/iu },
  { domain: "work", pattern: /\b(?:work|업무)\b/iu },
  { domain: "travel", pattern: /\b(?:travel|여행)\b/iu },
  { domain: "health", pattern: /\b(?:health|건강)\b/iu },
  { domain: "finance", pattern: /\b(?:finance|금융)\b/iu },
  { domain: "relationship", pattern: /\b(?:relationship|관계)\b/iu },
  { domain: "daily_life", pattern: /\b(?:daily[_\s-]?life|일상)\b/iu },
];

export function detectLifeDomain(message: string): LifeDomainKey | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  for (const entry of EXPLICIT_DOMAIN) {
    if (entry.pattern.test(trimmed)) {
      return entry.domain;
    }
  }

  for (const entry of DOMAIN_PATTERNS) {
    if (entry.pattern.test(trimmed)) {
      return entry.domain;
    }
  }

  return null;
}

export function isLifeDomainBoardRequest(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  return /(?:도메인\s*액션|생활\s*액션|액션\s*보드|버튼\s*보여|life\s*domain)/iu.test(trimmed);
}

export function resolveLifeDomainLabel(domain: LifeDomainKey): string {
  const entry = LIFE_DOMAIN_BY_KEY[domain];
  return `${entry.label} · ${entry.subtitle}`;
}

export function isKnownLifeDomain(value: string): value is LifeDomainKey {
  return listLifeDomainKeys().includes(value as LifeDomainKey);
}
