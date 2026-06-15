/**
 * Threadline / DEOS Adaptive QA — seed utterances by user-facing category.
 */

export type AdaptiveTestCategory =
  | "FOOD"
  | "DECISION"
  | "PLANNING"
  | "SOCIAL"
  | "LIFE"
  | "INFO"
  | "EMOTION"
  | "TECH";

export type AdaptiveTestCase = {
  id: number;
  input: string;
  category: AdaptiveTestCategory;
};

export const ADAPTIVE_QA_CASES: AdaptiveTestCase[] = [
  { id: 1, input: "오늘 뭐 먹지?", category: "FOOD" },
  { id: 2, input: "근처 맛집 추천", category: "FOOD" },
  { id: 3, input: "배달 뭐 시킬까?", category: "FOOD" },
  { id: 4, input: "이거 사도 돼?", category: "DECISION" },
  { id: 5, input: "A vs B 뭐가 좋아?", category: "DECISION" },
  { id: 6, input: "여행 일정 짜줘", category: "PLANNING" },
  { id: 7, input: "내일 일정 정리", category: "PLANNING" },
  { id: 8, input: "답장 뭐라고 하지?", category: "SOCIAL" },
  { id: 9, input: "이 말 해도 돼?", category: "SOCIAL" },
  { id: 10, input: "이 동네 살아도 돼?", category: "LIFE" },
  { id: 11, input: "원룸 추천", category: "LIFE" },
  { id: 12, input: "이거 뭐야?", category: "INFO" },
  { id: 13, input: "쉽게 설명해줘", category: "INFO" },
  { id: 14, input: "나 잘하고 있는 거야?", category: "EMOTION" },
  { id: 15, input: "너무 힘들어", category: "EMOTION" },
  { id: 16, input: "AI 뭐야?", category: "TECH" },
  { id: 17, input: "이거 어떻게 써?", category: "TECH" },
];

export const ADAPTIVE_QA_CATEGORIES = [
  "FOOD",
  "DECISION",
  "PLANNING",
  "SOCIAL",
  "LIFE",
  "INFO",
  "EMOTION",
  "TECH",
] as const satisfies readonly AdaptiveTestCategory[];
