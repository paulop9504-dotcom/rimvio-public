import type { ScheduleQueryAnalysis } from "@/lib/schedule-intelligence/types";

const STOPWORDS =
  /(?:일정|스케줄|캘린더|태스크|할\s*일|리스트|목록|뭐|무엇|알려|불러|보여|확인|있|언제|내일|모레|오늘|이번\s*주|금주|관련|가장|최근|마지막|입력|등록|부터|까지|오전|오후|\d{1,2}\s*시|\d{1,2}:\d{2})/gu;

const CATEGORY_TERMS =
  /(?:치과|병원|미용|헤어|네일|미팅|회의|약속|점심|저녁|식사|운동|수업|강의|면접|검진|마감|납품|프로젝트)/gu;

function expandCompoundToken(token: string): string[] {
  const out = new Set<string>([token]);
  for (const suffix of ["예약", "방문", "미팅", "일정", "약속"]) {
    if (token.endsWith(suffix) && token.length > suffix.length + 1) {
      out.add(token.slice(0, -suffix.length));
      out.add(suffix);
    }
  }
  return [...out].filter((part) => part.length >= 2);
}

/** Keywords for Deep Retrieval — person name + domain terms from message. */
export function extractRetrievalKeywords(
  message: string,
  analysis?: ScheduleQueryAnalysis | null
): string[] {
  const terms = new Set<string>();

  if (analysis?.personName?.trim()) {
    terms.add(analysis.personName.trim());
  }

  for (const match of message.matchAll(CATEGORY_TERMS)) {
    if (match[0]?.trim()) {
      terms.add(match[0].trim());
    }
  }

  const quoted = message.match(/['"「]([^'"」]{2,16})['"」]/u)?.[1];
  if (quoted?.trim()) {
    terms.add(quoted.replace(/님$/u, "").trim());
  }

  const cleaned = message
    .replace(STOPWORDS, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const chunk of cleaned.split(/\s+/u).filter((part) => part.length >= 2)) {
    if (chunk.length <= 16) {
      terms.add(chunk);
    }
    for (const part of expandCompoundToken(chunk)) {
      terms.add(part);
    }
  }

  return [...terms].filter((term) => term.length >= 2).slice(0, 8);
}

export function hasRetrievalKeywords(keywords: string[]): boolean {
  return keywords.length > 0;
}
