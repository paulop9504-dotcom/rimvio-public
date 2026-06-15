import { composeThreadlineFromProof } from "@/lib/deos/decision/compose-threadline-card";
import type { DecisionCardModel } from "@/lib/threadline/threadline-types";
import type { ProofProjectionInput } from "@/lib/threadline/proof-to-decision-card";
import { THREADLINE_ACTIVE_OCR_CARD_ID } from "@/lib/threadline/seed-ocr-waiting-card";

export function upsertCardFromProof(
  cards: DecisionCardModel[],
  input: ProofProjectionInput
): DecisionCardModel[] {
  const next = composeThreadlineFromProof({
    proof: input.proof,
    gatePhase: input.gatePhase,
  }).card;
  const history = cards.filter(
    (c) =>
      c.id !== next.id &&
      c.id !== THREADLINE_ACTIVE_OCR_CARD_ID &&
      c.state !== "WAITING" &&
      c.state !== "WORKING"
  );

  return [next, ...history];
}

export function upsertSeedCard(
  cards: DecisionCardModel[],
  seed: DecisionCardModel
): DecisionCardModel[] {
  const withoutActive = cards.filter(
    (c) =>
      c.id !== seed.id &&
      c.state !== "WAITING" &&
      c.state !== "WORKING"
  );
  return [seed, ...withoutActive];
}

export function moveCardToDeferred(
  cards: DecisionCardModel[],
  deferred: DecisionCardModel[],
  cardId: string
): { cards: DecisionCardModel[]; deferred: DecisionCardModel[] } {
  const target = cards.find((c) => c.id === cardId);
  if (!target) {
    return { cards, deferred };
  }
  const snapshot: DecisionCardModel = {
    ...target,
    state: "DEFERRED",
    chips: target.chips,
  };
  return {
    cards: cards.filter((c) => c.id !== cardId),
    deferred: [
      snapshot,
      ...deferred.filter((c) => c.id !== cardId),
    ],
  };
}

export function restoreDeferredCard(
  cards: DecisionCardModel[],
  deferred: DecisionCardModel[],
  cardId: string
): { cards: DecisionCardModel[]; deferred: DecisionCardModel[] } {
  const target = deferred.find((c) => c.id === cardId);
  if (!target) {
    return { cards, deferred };
  }
  const withoutActive = cards.filter(
    (c) => c.state !== "WAITING" && c.state !== "WORKING"
  );
  const restored: DecisionCardModel = {
    ...target,
    state: "WAITING",
    updatedAt: new Date().toISOString(),
  };
  return {
    cards: [restored, ...withoutActive],
    deferred: deferred.filter((c) => c.id !== cardId),
  };
}

export function applySendingToActiveWaiting(
  cards: DecisionCardModel[],
  sending: boolean
): DecisionCardModel[] {
  if (!sending) {
    return cards.map((c) =>
      c.state === "WORKING" ? { ...c, state: "WAITING" as const } : c
    );
  }
  const idx = cards.findIndex((c) => c.state === "WAITING");
  if (idx < 0) {
    return cards;
  }
  return cards.map((c, i) =>
    i === idx ? { ...c, state: "WORKING" as const, chips: undefined } : c
  );
}

/** @deprecated Use moveCardToDeferred — keeps card for recovery strip. */
export function deferCard(cards: DecisionCardModel[], cardId: string): DecisionCardModel[] {
  return cards.filter((c) => c.id !== cardId);
}

export function resetThreadlineCards(): DecisionCardModel[] {
  return [];
}
