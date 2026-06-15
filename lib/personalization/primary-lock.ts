import { PRIMARY_HYSTERESIS_MARGIN } from "@/lib/personalization/constants";
import type { LinkActionItem } from "@/types/database";

export type PrimaryScoreEntry = {
  action: LinkActionItem;
  total: number;
};

/**
 * Session/user-behavior primary stabilization.
 *
 * Once a primary is chosen (or user taps a chip), a challenger must beat the
 * incumbent by PRIMARY_HYSTERESIS_MARGIN to swap — prevents reopen flicker.
 */
export function resolvePrimaryWithHysteresis(input: {
  scored: PrimaryScoreEntry[];
  incumbentActionId?: string | null;
  fallback: LinkActionItem | null;
}): LinkActionItem | null {
  const winner = input.fallback;
  if (!winner) {
    return null;
  }

  const incumbentId = input.incumbentActionId?.trim();
  if (!incumbentId || incumbentId === winner.id) {
    return winner;
  }

  const incumbent = input.scored.find((entry) => entry.action.id === incumbentId);
  if (!incumbent) {
    return winner;
  }

  const winnerScore =
    input.scored.find((entry) => entry.action.id === winner.id)?.total ??
    input.scored[0]?.total ??
    0;

  if (winnerScore - incumbent.total < PRIMARY_HYSTERESIS_MARGIN) {
    return incumbent.action;
  }

  return winner;
}
