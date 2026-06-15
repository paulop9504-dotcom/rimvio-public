import type { FoodCandidate } from "@/lib/event-os/contextual-recommendation/recommendation-types";

/** Constraint-first catalog — generation is independent of scoring. */
export const DEFAULT_FOOD_CANDIDATES: FoodCandidate[] = [
  {
    item: "김치찌개",
    category: "korean_soup",
    heaviness: 0.45,
    nutritionBalance: 0.72,
    satisfactionBase: 0.82,
    warmSoup: true,
  },
  {
    item: "된장찌개",
    category: "korean_soup",
    heaviness: 0.4,
    nutritionBalance: 0.78,
    satisfactionBase: 0.8,
    warmSoup: true,
  },
  {
    item: "연어 포케볼",
    category: "poke",
    heaviness: 0.25,
    nutritionBalance: 0.88,
    satisfactionBase: 0.76,
    warmSoup: false,
  },
  {
    item: "샐러드 치킨볼",
    category: "salad",
    heaviness: 0.2,
    nutritionBalance: 0.9,
    satisfactionBase: 0.7,
    warmSoup: false,
  },
  {
    item: "라멘",
    category: "noodle",
    heaviness: 0.55,
    nutritionBalance: 0.5,
    satisfactionBase: 0.85,
    warmSoup: true,
  },
  {
    item: "제육볶음",
    category: "korean_main",
    heaviness: 0.7,
    nutritionBalance: 0.48,
    satisfactionBase: 0.88,
    warmSoup: false,
  },
  {
    item: "파스타",
    category: "pasta",
    heaviness: 0.5,
    nutritionBalance: 0.55,
    satisfactionBase: 0.8,
    warmSoup: false,
  },
];

export function generateFoodCandidates(
  seed?: readonly FoodCandidate[]
): FoodCandidate[] {
  return (seed ?? DEFAULT_FOOD_CANDIDATES).map((row) => ({ ...row }));
}
