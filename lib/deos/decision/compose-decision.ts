import {
  candidateById,
  topRanked,
} from "@/lib/deos/decision/rank-candidates";
import type {
  CandidateAction,
  CandidateActionKind,
  ComposeDecisionInput,
  ComposeDecisionResult,
  DecisionSurface,
  ForkChipSpec,
} from "@/lib/deos/decision/decision-contract-types";
import {
  applyEnvelopeGateToCompose,
  envelopeBlockedSurface,
  vetoActionForEnvelope,
} from "@/lib/deos/decision/compose-envelope-gate";
import {
  validateStateTransition,
  validateSurfaceTransition,
} from "@/lib/deos/decision/validate-state-transition";

export const COMPOSE_DECISION_VERSION = "compose-v1";

const MAX_FORK_CHIPS = 3;

function becauseFromAction(action: CandidateAction, fallback: string): string {
  if (action.becauseHint?.trim()) {
    return action.becauseHint.trim();
  }
  switch (action.kind) {
    case "ocr_date":
    case "ocr_open_date_picker":
      return "사진 일정은 맞는데, 이 항목에 날짜가 아직 없어요.";
    case "ocr_confirm":
      return "날짜를 골랐어요. 캘린더에 넣기 전에 한 번만 확인해 주세요.";
    case "ocr_approve":
      return "내용을 확인해 주시면 다음 단계로 넘길 수 있어요.";
    case "defer":
      return "지금은 보류할 수 있어요. 나중에 이어갈 수 있어요.";
    default:
      return fallback;
  }
}

function chipRole(index: number, kind: CandidateActionKind): ForkChipSpec["role"] {
  if (kind === "defer") {
    return "escape";
  }
  if (index === 0) {
    return "default";
  }
  return "alternative";
}

function buildForkSurface(input: {
  title: string;
  actions: CandidateAction[];
  because: string;
}): DecisionSurface {
  const chips: ForkChipSpec[] = input.actions.slice(0, MAX_FORK_CHIPS).map(
    (action, index) => ({
      id: `chip:${action.id}`,
      label: action.label,
      role: chipRole(index, action.kind),
      actionId: action.id,
    })
  );

  return {
    mode: "fork",
    title: input.title,
    because: input.because,
    targetState: "WAITING",
    chips,
    maxChips: MAX_FORK_CHIPS,
  };
}

function targetStateForAction(
  action: CandidateAction
): import("@/lib/deos/decision/decision-contract-types").DeosCardState {
  if (action.kind === "defer") {
    return "DEFERRED";
  }
  if (
    action.kind === "calendar_commit" ||
    action.kind === "ocr_confirm"
  ) {
    return "DONE";
  }
  return "WAITING";
}

function transitionFor(
  state: ComposeDecisionInput["state"],
  action: CandidateAction
): import("@/lib/deos/decision/decision-contract-types").StateTransitionRequest {
  const to = targetStateForAction(action);
  const from = state.cardState;
  if (from === "WAITING" && to === "DONE") {
    return { from, to: "WORKING", viaActionId: action.id };
  }
  return { from, to, viaActionId: action.id };
}

/**
 * Decision Engine — sole decision authority.
 * Inputs: intent + state context + plugin candidates + probability ranking.
 */
export function composeDecision(input: ComposeDecisionInput): ComposeDecisionResult {
  const diagnostics: string[] = [];
  const title = input.title ?? "오늘 일정";

  const gated = applyEnvelopeGateToCompose(input);
  diagnostics.push(...gated.diagnostics);

  if (gated.earlyBlocked) {
    return {
      surface: gated.earlyBlocked,
      actionIds: [],
      composeVersion: COMPOSE_DECISION_VERSION,
      diagnostics,
    };
  }

  const candidates = gated.candidates;
  const probability = gated.probability;
  const ranked = topRanked(probability, MAX_FORK_CHIPS);

  if (ranked.length === 0) {
    const blocked: DecisionSurface = {
      mode: "blocked",
      title,
      because: "지금은 선택할 수 있는 다음 행동이 없어요.",
      targetState: input.state.cardState,
      reason: "no_candidates",
    };
    return {
      surface: blocked,
      actionIds: [],
      composeVersion: COMPOSE_DECISION_VERSION,
      diagnostics: ["no_candidates"],
    };
  }

  const top = ranked[0];
  const topAction = candidateById(candidates, top.candidateId);
  if (!topAction) {
    const blocked: DecisionSurface = {
      mode: "blocked",
      title,
      because: "후보를 찾지 못했어요.",
      targetState: input.state.cardState,
      reason: "top_candidate_missing",
    };
    return {
      surface: blocked,
      actionIds: [],
      composeVersion: COMPOSE_DECISION_VERSION,
      diagnostics: ["top_candidate_missing"],
    };
  }

  const topVeto = vetoActionForEnvelope({
    action: topAction,
    envelope: input.envelope,
    envelopeUsage: input.envelopeUsage,
    scopeId: input.state.scopeId,
  });
  if (!topVeto.allowed) {
    diagnostics.push(`envelope_veto:${topVeto.reason ?? "unknown"}`);
    return {
      surface: envelopeBlockedSurface(input, topVeto.reason),
      actionIds: [],
      composeVersion: COMPOSE_DECISION_VERSION,
      diagnostics,
    };
  }

  const second = ranked[1];
  const gap =
    second != null ? top.score - second.score : top.score;
  const settledTarget = targetStateForAction(topAction);
  if (
    input.state.cardState === settledTarget &&
    settledTarget !== "WAITING"
  ) {
    const surface: DecisionSurface = {
      mode: "auto",
      title,
      because: becauseFromAction(topAction, "처리가 끝났어요."),
      targetState: settledTarget,
      action: topAction,
      transition: {
        from: input.state.cardState,
        to: settledTarget,
        viaActionId: topAction.id,
      },
    };
    return {
      surface,
      actionIds: [topAction.id],
      composeVersion: COMPOSE_DECISION_VERSION,
      diagnostics: ["already_settled"],
    };
  }

  const forkRequired =
    input.state.cardState === "WAITING" &&
    (gap < 0.15 ||
      topAction.kind === "ocr_open_date_picker" ||
      input.state.gatePhase != null ||
      top.confidence < 0.55);

  if (forkRequired) {
    const forkActions = ranked
      .map((r) => candidateById(candidates, r.candidateId))
      .filter((a): a is CandidateAction => Boolean(a));

    const escape = candidates.find((c) => c.kind === "defer");
    if (escape && !forkActions.some((a) => a.id === escape.id)) {
      forkActions.push(escape);
    }

    const surface = buildForkSurface({
      title,
      actions: forkActions,
      because: becauseFromAction(topAction, "다음 중 하나를 선택해 주세요."),
    });

    const valid = validateSurfaceTransition(surface);
    if (!valid.allowed) {
      diagnostics.push(valid.reason ?? "fork_transition_invalid");
    }

    return {
      surface,
      actionIds: forkActions.map((a) => a.id),
      composeVersion: COMPOSE_DECISION_VERSION,
      diagnostics,
    };
  }

  const transition = transitionFor(input.state, topAction);
  const valid = validateStateTransition(transition);
  if (!valid.allowed) {
    diagnostics.push(valid.reason ?? "auto_transition_invalid");
    const surface = buildForkSurface({
      title,
      actions: ranked
        .map((r) => candidateById(candidates, r.candidateId))
        .filter((a): a is CandidateAction => Boolean(a)),
      because: "이 상태에서는 자동으로 진행할 수 없어요.",
    });
    return {
      surface,
      actionIds: surface.chips.map((c) => c.actionId),
      composeVersion: COMPOSE_DECISION_VERSION,
      diagnostics,
    };
  }

  const surface: DecisionSurface = {
    mode: "auto",
    title,
    because: becauseFromAction(topAction, "바로 처리할게요."),
    targetState: targetStateForAction(topAction),
    action: topAction,
    transition,
  };

  return {
    surface,
    actionIds: [topAction.id],
    composeVersion: COMPOSE_DECISION_VERSION,
    diagnostics,
  };
}
