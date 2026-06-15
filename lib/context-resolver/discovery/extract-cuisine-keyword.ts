/** User-facing cuisine / food-type tokens for Naver local search. */
export const CUISINE_KEYWORDS = [
  "스테이크",
  "steak",
  "파스타",
  "pizza",
  "피자",
  "초밥",
  "스시",
  "sushi",
  "삼겹살",
  "갈비",
  "돈까스",
  "라멘",
  "우동",
  "칼국수",
  "국밥",
  "떡볶이",
  "회",
  "해산물",
  "치킨",
  "족발",
  "보쌈",
  "냉면",
  "브런치",
  "디저트",
  "베이커리",
  "중식",
  "일식",
  "한식",
  "양식",
  "멕시칸",
  "태국",
  "인도",
  "술집",
  "포차",
  "이자카야",
  "빙수",
  "만두",
  "빵",
] as const;

const SORTED_CUISINE_KEYWORDS = [...CUISINE_KEYWORDS].sort((a, b) => b.length - a.length);

export function extractCuisineKeyword(message: string): string | null {
  const normalized = message.trim();
  for (const term of SORTED_CUISINE_KEYWORDS) {
    if (normalized.toLowerCase().includes(term.toLowerCase())) {
      return term;
    }
  }
  return null;
}
