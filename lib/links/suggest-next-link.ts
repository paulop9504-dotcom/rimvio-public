import { findSimilarLinks } from "@/lib/links/similar-links";
import type { LinkRow } from "@/types/database";

export function suggestNextLink(
  current: LinkRow,
  pool: LinkRow[]
): LinkRow | null {
  const others = pool.filter((link) => link.id !== current.id);

  if (others.length === 0) {
    return null;
  }

  const [similar] = findSimilarLinks(current, pool, 1);
  if (similar) {
    return similar;
  }

  const currentIndex = pool.findIndex((link) => link.id === current.id);
  if (currentIndex >= 0 && currentIndex < pool.length - 1) {
    return pool[currentIndex + 1];
  }

  return others[0] ?? null;
}
