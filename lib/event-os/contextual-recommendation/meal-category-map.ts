import type { FoodCategory } from "@/lib/event-os/contextual-recommendation/recommendation-types";

const MEAL_CATEGORY_RULES: Array<{ pattern: RegExp; category: FoodCategory }> = [
  { pattern: /햄버거|버거|burger|맥도|롯데리아|맘스터치/u, category: "burger" },
  { pattern: /피자|pizza/u, category: "pasta" },
  { pattern: /치킨|닭/u, category: "fried" },
  { pattern: /찌개|국|탕|스프|soup/u, category: "korean_soup" },
  { pattern: /볶음|제육|불고기|비빔밥/u, category: "korean_main" },
  { pattern: /포케|poke|연어/u, category: "poke" },
  { pattern: /샐러드|salad/u, category: "salad" },
  { pattern: /라면|라멘|우동|면|noodle/iu, category: "noodle" },
  { pattern: /파스타|스파게티|pasta/u, category: "pasta" },
];

export function inferMealCategory(label: string): FoodCategory | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  for (const rule of MEAL_CATEGORY_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.category;
    }
  }
  return null;
}

export function isHeavyCategory(category: FoodCategory | null): boolean {
  if (!category) {
    return false;
  }
  return category === "burger" || category === "fried" || category === "korean_main";
}
