import { inferMealCategory } from "@/lib/event-os/contextual-recommendation/meal-category-map";
import type { MealEventRecord } from "@/lib/event-os/contextual-recommendation/recommendation-types";

type ChatTurn = { role?: string; content?: string };

const MEAL_LINE =
  /(?:어제|방금|점심|아침|저녁).{0,20}?(?:먹|먹었|드셨)|(?:햄버거|피자|치킨|찌개|볶음|라면|파스타|포케|샐러드)/u;

/** Project optional chat history into meal event records for context layer. */
export function mealHistoryFromChatHistory(
  history: readonly ChatTurn[] | undefined
): MealEventRecord[] {
  if (!history?.length) {
    return [];
  }

  const records: MealEventRecord[] = [];
  for (const turn of history) {
    const content = turn.content?.trim();
    if (!content || !MEAL_LINE.test(content)) {
      continue;
    }
    const category = inferMealCategory(content);
    const label =
      content.match(/(?:햄버거|피자|치킨|김치찌개|된장찌개|라면|파스타|포케|샐러드)/u)?.[0] ??
      content.slice(0, 24);
    records.push({
      label,
      category: category ?? undefined,
    });
  }
  return records;
}
