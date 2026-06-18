import { normalizeLinkCategory } from "@/lib/categories/types";
import type { LinkRow } from "@/types/database";

export function findSimilarLinks(
  current: LinkRow,
  pool: LinkRow[],
  limit = 3
): LinkRow[] {
  const others = pool.filter((link) => link.id !== current.id);

  if (others.length === 0) {
    return [];
  }

  const currentCategory = normalizeLinkCategory(current.category);
  const scored = others.map((link) => {
    let score = 0;
    const category = normalizeLinkCategory(link.category);

    if (current.domain && link.domain === current.domain) {
      score += 3;
    }

    if (currentCategory !== "uncategorized" && category === currentCategory) {
      score += 2;
    }

    if (current.source_type && link.source_type === current.source_type) {
      score += 1;
    }

    return { link, score };
  });

  return scored
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (
        new Date(right.link.created_at).getTime() -
        new Date(left.link.created_at).getTime()
      );
    })
    .filter((entry) => entry.score > 0)
    .slice(0, limit)
    .map((entry) => entry.link);
}
