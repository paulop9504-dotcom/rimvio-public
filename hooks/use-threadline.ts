"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { OcrReviewDatePickerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import {
  composeThreadlineFromOcr,
  composeThreadlineFromProof,
} from "@/lib/deos/decision/compose-threadline-card";
import { resolvePayloadFromActionId } from "@/lib/deos/decision/project-surface-to-threadline";
import type { CandidateAction } from "@/lib/deos/decision/decision-contract-types";
import {
  applySendingToActiveWaiting,
  moveCardToDeferred,
  resetThreadlineCards,
  restoreDeferredCard,
} from "@/lib/threadline";
import type { DecisionCardModel } from "@/lib/threadline/threadline-types";
import { THREADLINE_ACTIVE_OCR_CARD_ID } from "@/lib/threadline/seed-ocr-waiting-card";

export type UseThreadlineOptions = {
  sending: boolean;
  gatePhase: "awaiting_date" | "awaiting_confirm" | null;
  onResolvePayload: (
    payload: import("@/lib/threadline/threadline-types").ResolveChipPayload
  ) => void | Promise<void>;
};

type ThreadlineState = {
  cards: DecisionCardModel[];
  deferred: DecisionCardModel[];
  candidates: CandidateAction[];
  chipActionMap: Record<string, string>;
};

type ThreadlineAction =
  | { type: "reset" }
  | {
      type: "compose";
      card: DecisionCardModel;
      candidates: CandidateAction[];
      chipActionMap: Record<string, string>;
    }
  | { type: "sending"; sending: boolean }
  | { type: "defer"; cardId: string }
  | { type: "restore"; cardId: string };

function upsertComposedCard(
  cards: DecisionCardModel[],
  card: DecisionCardModel
): DecisionCardModel[] {
  const withoutActive = cards.filter(
    (c) =>
      c.id !== card.id &&
      c.id !== THREADLINE_ACTIVE_OCR_CARD_ID &&
      c.state !== "WAITING" &&
      c.state !== "WORKING"
  );
  return [card, ...withoutActive];
}

function reducer(state: ThreadlineState, action: ThreadlineAction): ThreadlineState {
  switch (action.type) {
    case "reset":
      return {
        cards: resetThreadlineCards(),
        deferred: [],
        candidates: [],
        chipActionMap: {},
      };
    case "compose":
      return {
        ...state,
        cards: upsertComposedCard(state.cards, action.card),
        candidates: action.candidates,
        chipActionMap: action.chipActionMap,
      };
    case "sending":
      return {
        ...state,
        cards: applySendingToActiveWaiting(state.cards, action.sending),
      };
    case "defer": {
      const result = moveCardToDeferred(state.cards, state.deferred, action.cardId);
      return { ...state, cards: result.cards, deferred: result.deferred };
    }
    case "restore": {
      const result = restoreDeferredCard(state.cards, state.deferred, action.cardId);
      return { ...state, cards: result.cards, deferred: result.deferred };
    }
    default:
      return state;
  }
}

export function useThreadline(options: UseThreadlineOptions) {
  const [state, dispatch] = useReducer(reducer, {
    cards: [],
    deferred: [],
    candidates: [],
    chipActionMap: {},
  });
  const gateRef = useRef(options.gatePhase);
  const candidatesRef = useRef<CandidateAction[]>([]);
  const chipActionMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    gateRef.current = options.gatePhase;
  }, [options.gatePhase]);

  useEffect(() => {
    candidatesRef.current = state.candidates;
    chipActionMapRef.current = state.chipActionMap;
  }, [state.candidates, state.chipActionMap]);

  const applyComposition = useCallback(
    (composition: ReturnType<typeof composeThreadlineFromOcr>) => {
      dispatch({
        type: "compose",
        card: composition.card,
        candidates: composition.candidates,
        chipActionMap: composition.chipActionMap,
      });
    },
    []
  );

  const ingestProof = useCallback((proof: CausalProof) => {
    const composition = composeThreadlineFromProof({
      proof,
      gatePhase: gateRef.current,
    });
    applyComposition(composition);
  }, [applyComposition]);

  const seedFromOcrTrigger = useCallback(
    (
      trigger: OcrReviewDatePickerWire,
      gatePhase: "awaiting_date" | "awaiting_confirm" = "awaiting_date"
    ) => {
      const composition = composeThreadlineFromOcr({
        trigger,
        gatePhase,
        scopeId: "default",
      });
      applyComposition(composition);
    },
    [applyComposition]
  );

  useEffect(() => {
    dispatch({ type: "sending", sending: options.sending });
  }, [options.sending]);

  const handleResolveChip = useCallback(
    async (cardId: string, chipId: string) => {
      if (chipId === "defer") {
        dispatch({ type: "defer", cardId });
        return;
      }

      const actionId = chipActionMapRef.current[chipId];
      const payload = actionId
        ? resolvePayloadFromActionId(actionId, candidatesRef.current)
        : null;

      if (!payload) {
        return;
      }
      if (payload.kind === "defer") {
        dispatch({ type: "defer", cardId });
        return;
      }
      await options.onResolvePayload(payload);
    },
    [options.onResolvePayload]
  );

  const restoreDeferred = useCallback((cardId: string) => {
    dispatch({ type: "restore", cardId });
  }, []);

  const resetThreadline = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  return {
    threadlineCards: state.cards,
    deferredCards: state.deferred,
    ingestProof,
    seedFromOcrTrigger,
    handleResolveChip,
    restoreDeferred,
    resetThreadline,
  };
}
