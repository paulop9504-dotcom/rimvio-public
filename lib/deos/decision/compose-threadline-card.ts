import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { OcrReviewDatePickerWire } from "@/lib/action-chat/action-oriented-prompt";
import { composeDecision } from "@/lib/deos/decision/compose-decision";
import type {
  ComposeDecisionResult,
  DeosStateContext,
  UserIntent,
} from "@/lib/deos/decision/decision-contract-types";
import {
  candidatesFromProof,
  deosStateFromProof,
  titleFromProofContext,
} from "@/lib/deos/decision/candidates-from-proof";
import { ocrReviewCandidatesFromTrigger } from "@/lib/deos/decision/ocr-plugin-candidates";
import { rankCandidates } from "@/lib/deos/decision/rank-candidates";
import {
  chipResolveIdFromFork,
  projectSurfaceToDecisionCard,
} from "@/lib/deos/decision/project-surface-to-threadline";
import type { DecisionCardModel } from "@/lib/threadline/threadline-types";
import {
  becauseFromProof,
  reviewDeltasFromProof,
  settledLineFromProof,
} from "@/lib/threadline/proof-to-decision-card";
import type { DecisionSurface } from "@/lib/deos/decision/decision-contract-types";
import type { CandidateAction } from "@/lib/deos/decision/decision-contract-types";

export type ThreadlineComposition = {
  card: DecisionCardModel;
  candidates: CandidateAction[];
  compose: ComposeDecisionResult;
  /** Resolve chip id → plugin action id */
  chipActionMap: Record<string, string>;
};

function chipActionMapFromSurface(surface: DecisionSurface): Record<string, string> {
  if (surface.mode !== "fork") {
    return {};
  }
  const map: Record<string, string> = {};
  for (const chip of surface.chips) {
    map[chipResolveIdFromFork(chip.actionId, chip.id)] = chip.actionId;
  }
  return map;
}

function enrichCardFromProof(card: DecisionCardModel, proof: CausalProof): DecisionCardModel {
  if (card.state !== "DONE") {
    return {
      ...card,
      because: becauseFromProof(proof),
      proof,
    };
  }
  return {
    ...card,
    because: becauseFromProof(proof),
    settledLine: settledLineFromProof(proof),
    reviewDeltas: reviewDeltasFromProof(proof),
    proof,
    chips: undefined,
  };
}

function runCompose(input: {
  intent: UserIntent;
  state: DeosStateContext;
  candidates: CandidateAction[];
  title: string;
  cardId: string;
  proof?: CausalProof;
}): ThreadlineComposition {
  const probability = rankCandidates(input.candidates);
  const compose = composeDecision({
    intent: input.intent,
    state: input.state,
    candidates: input.candidates,
    probability,
    title: input.title,
  });

  let card = projectSurfaceToDecisionCard(compose.surface, {
    cardId: input.cardId,
    updatedAt: input.proof?.input.clockIso ?? new Date().toISOString(),
  });

  if (input.proof) {
    card = enrichCardFromProof(card, input.proof);
  }

  const chipActionMap = chipActionMapFromSurface(compose.surface);

  return {
    card,
    candidates: input.candidates,
    compose,
    chipActionMap,
  };
}

/** OCR ingress — before proof exists. */
export function composeThreadlineFromOcr(input: {
  trigger: OcrReviewDatePickerWire;
  gatePhase?: "awaiting_date" | "awaiting_confirm";
  scopeId?: string;
  raw?: string;
}): ThreadlineComposition {
  const gatePhase = input.gatePhase ?? "awaiting_date";
  const candidates = ocrReviewCandidatesFromTrigger(input.trigger, gatePhase);
  const title = input.trigger.rows[0]?.title?.trim() || "오늘 일정";

  return runCompose({
    intent: {
      raw: input.raw ?? "",
      kind: "add",
      scopeId: input.scopeId ?? "default",
      clockIso: new Date().toISOString(),
    },
    state: {
      scopeId: input.scopeId ?? "default",
      cardState: "WAITING",
      activeCardId: "card:ocr-active",
      gatePhase,
    },
    candidates,
    title,
    cardId: "card:ocr-active",
  });
}

/** After Event OS returns CausalProof — surface still from composeDecision only. */
export function composeThreadlineFromProof(input: {
  proof: CausalProof;
  gatePhase?: DeosStateContext["gatePhase"];
  raw?: string;
}): ThreadlineComposition {
  const state = deosStateFromProof(input.proof, input.gatePhase);
  const candidates = candidatesFromProof(input.proof, state.gatePhase);
  const title = titleFromProofContext(input.proof);

  let intentKind: UserIntent["kind"] = "resolve";
  if (input.proof.input.step === "approve") {
    intentKind = "approve_speech";
  } else if (input.proof.input.step === "date") {
    intentKind = "date_patch";
  } else if (input.proof.input.step === "confirm") {
    intentKind = "confirm";
  }

  return runCompose({
    intent: {
      raw: input.raw ?? input.proof.input.action,
      kind: intentKind,
      scopeId: input.proof.input.scopeId,
      clockIso: input.proof.input.clockIso,
    },
    state,
    candidates,
    title,
    cardId: `card:${input.proof.proofHash}`,
    proof: input.proof,
  });
}
