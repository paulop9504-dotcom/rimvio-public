import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { priorHistoryForRoute } from "@/lib/action-chat/intent-router-core";
import {
  containsDeicticReference,
} from "@/lib/event-kernel/memory/collect-memory-hints";
import { buildRecalledCanonicalQuery } from "@/lib/event-kernel/intent-routing-kernel/deictic-recall";
import type {
  KernelFinalState,
  KernelIntentDecision,
  KernelRouteType,
  MemoryHintCandidate,
  MemoryHints,
} from "@/lib/event-kernel/intent-kernel-system/types";
import { ENTROPY_OPTIONS_THRESHOLD, type EventKernelState } from "@/lib/event-kernel/types";

const ACK_RECEIPT =
  /^(?:응|네|예|그래|좋아|오케이|ok|okay|ㅇㅇ|ㅇ(?:\.|$)|맞(?:아|아요)?)(?:[!?.~ㅋㅎ\s]*)?$/iu;
const STRONG_INTENT =
  /(?:가격|얼마|언제|어디|찾아|알려|예약|일정|검색|추천|경기장|월드컵)/iu;
const BUSINESS_ATTRIBUTE =
  /(?:가격|얼마|위치|어디|영업|전화|주차|메뉴|예약|정보|리뷰|후기)/iu;
/** STEP 1 — actionable intent markers (price, refund, policy, info, search). */
const ACTION_REQUEST_ATTRIBUTE =
  /(?:가격|얼마|환불|정책|방법|절차|위치|어디|영업|전화|주차|메뉴|예약|정보|리뷰|후기|알려|찾아|검색|추천|뭐야|뭔데|길\s*찾|길찾|경로|가는\s*길|찾아가기)/iu;
const RECALL_QUESTION =
  /^(?:그거|그게|저거|이거)\s*뭐(?:였|더|야)?(?:지|어|나|까|더라)?/iu;

export type DecideKernelIntentInput = {
  message: string;
  history?: OrchestrateHistoryTurn[];
  base: EventKernelState;
  memoryHints: MemoryHints;
};

type DeicticResolution = "ACCEPT" | "REJECT" | "IGNORE";

function classifyPreviousTurnIntent(
  history: OrchestrateHistoryTurn[] | undefined,
  currentMessage: string
): "QUESTION" | "PROPOSAL" | "ACTION_OFFER" | "STATEMENT" | "UNKNOWN" {
  const prior = priorHistoryForRoute(history, currentMessage);
  const lastAssistant = [...prior].reverse().find((turn) => turn.role === "assistant");
  if (!lastAssistant?.content.trim()) {
    return "UNKNOWN";
  }
  const content = lastAssistant.content.trim();
  if (/[?？]/.test(content)) {
    return "QUESTION";
  }
  if (/(?:도와드릴까요|해볼까요|할까요|원하(?:세요|니|시)|괜찮(?:으세요|을까요)|진행할까요)/iu.test(content)) {
    return "PROPOSAL";
  }
  if (/(?:눌러\s*보|버튼|실행|길찾|예약\s*해|바로\s*)/iu.test(content)) {
    return "ACTION_OFFER";
  }
  return "STATEMENT";
}

function isAckType(message: string): boolean {
  const trimmed = message.trim();
  return ACK_RECEIPT.test(trimmed) && !STRONG_INTENT.test(trimmed);
}

function hasActionableAttribute(message: string, modifiers: readonly string[]): boolean {
  if (RECALL_QUESTION.test(message.trim())) {
    return false;
  }
  for (const modifier of modifiers) {
    const trimmed = modifier.trim();
    if (trimmed && !/^뭐(?:였|더|야)?(?:지|어|나|까)?$/iu.test(trimmed)) {
      if (ACTION_REQUEST_ATTRIBUTE.test(trimmed)) {
        return true;
      }
    }
  }
  return ACTION_REQUEST_ATTRIBUTE.test(message);
}

function hasBusinessAttribute(message: string, modifiers: readonly string[]): boolean {
  if (RECALL_QUESTION.test(message.trim())) {
    return false;
  }
  const modifier = modifiers[0]?.trim();
  if (modifier && !/^뭐(?:였|더|야)?(?:지|어|나|까)?$/iu.test(modifier)) {
    return BUSINESS_ATTRIBUTE.test(modifier) || BUSINESS_ATTRIBUTE.test(message);
  }
  return BUSINESS_ATTRIBUTE.test(message);
}

const ACTION_ONLY_MODIFIER =
  /^(?:환불|정책|방법|절차|정보|리뷰|후기|예약|메뉴|가격|얼마|위치|어디|영업|전화|주차)$/iu;

function resolveSubjectEntity(base: EventKernelState): string | null {
  const entity = base.frame.entities[0]?.trim();
  if (entity && entity.length >= 2) {
    return entity;
  }

  for (const modifier of base.frame.modifiers) {
    const trimmed = modifier.trim();
    if (trimmed.length >= 2 && !ACTION_ONLY_MODIFIER.test(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

function hasResolvableSubject(base: EventKernelState): boolean {
  return resolveSubjectEntity(base) !== null;
}

function isAmbiguousReferenceOnly(message: string, modifiers: readonly string[]): boolean {
  const trimmed = message.trim();
  if (RECALL_QUESTION.test(trimmed)) {
    return true;
  }
  return containsDeicticReference(trimmed) && !hasActionableAttribute(trimmed, modifiers);
}

/**
 * STEP 1–2 — ACTION REQUEST has absolute priority over CLARIFY.
 * Requires a resolvable subject plus an actionable attribute.
 */
function isActionRequest(message: string, base: EventKernelState): boolean {
  if (isAmbiguousReferenceOnly(message, base.frame.modifiers)) {
    return false;
  }

  if (!hasResolvableSubject(base)) {
    return false;
  }

  return hasActionableAttribute(message, base.frame.modifiers);
}

function directActionFromRequest(input: {
  message: string;
  base: EventKernelState;
  dominantProb: number;
  note: string;
}): KernelIntentDecision {
  const entity = resolveSubjectEntity(input.base);
  const business =
    hasBusinessAttribute(input.message, input.base.frame.modifiers) ||
    /(?:환불|정책|방법|절차|가격|얼마|예약|메뉴|영업|전화|주차|리뷰|후기)/iu.test(
      input.message
    ) ||
    input.base.frame.modifiers.some((modifier) =>
      /(?:환불|정책|방법|절차|가격|얼마|예약|메뉴|영업|전화|주차|리뷰|후기)/iu.test(modifier)
    );

  return {
    intent: "DIRECT_ACTION",
    state: "DIRECT_ACTION",
    route: business ? "BUSINESS_LOOKUP" : "GENERAL_SEARCH",
    confidence: Math.max(0.72, input.dominantProb),
    canonical_query: buildCanonicalQuery(input.message, entity, input.base.frame.modifiers),
    notes: input.note,
  };
}

function buildCanonicalQuery(
  message: string,
  entity: string | null,
  modifiers: readonly string[]
): string {
  const modifier = modifiers[0]?.trim() ?? "";
  if (entity && modifier) {
    return `${entity} ${modifier}`.trim();
  }
  if (entity) {
    return entity;
  }
  return message.trim();
}

function hasConversationContinuity(
  history: OrchestrateHistoryTurn[] | undefined,
  currentMessage: string
): boolean {
  const prior = priorHistoryForRoute(history, currentMessage);
  return prior.some((turn) => turn.content.trim().length >= 4);
}

function candidateAlignsWithContext(
  candidate: MemoryHintCandidate,
  memoryHints: MemoryHints,
  history: OrchestrateHistoryTurn[] | undefined,
  currentMessage: string
): boolean {
  const entity = candidate.entity.trim().toLowerCase();
  if (!entity) {
    return false;
  }

  for (const snippet of memoryHints.snippets) {
    if (snippet.toLowerCase().includes(entity)) {
      return true;
    }
  }

  const prior = priorHistoryForRoute(history, currentMessage);
  return prior.some((turn) => turn.content.toLowerCase().includes(entity));
}

function intentStability(base: EventKernelState): "stable" | "mixed" | "unstable" {
  if (base.committedDecision === "CLARIFY" || base.committedDecision === "OPTIONS") {
    return "unstable";
  }
  if (base.signals.includes("deictic_recall")) {
    return "mixed";
  }
  if (base.dominantIntent === "QUERY" || base.dominantIntent === "CONTINUE") {
    return "stable";
  }
  return "mixed";
}

/**
 * §4 PATCH — KERNEL contextual deictic resolution.
 * Memory scores are hints only; no numeric score gating.
 */
function evaluateDeicticResolution(input: {
  base: EventKernelState;
  message: string;
  history?: OrchestrateHistoryTurn[];
  memoryHints: MemoryHints;
  bestCandidate: MemoryHintCandidate | null;
}): DeicticResolution {
  const { base, message, history, memoryHints, bestCandidate } = input;
  const continuity = hasConversationContinuity(history, message);
  const recallQuestion = RECALL_QUESTION.test(message.trim());
  const stability = intentStability(base);

  if (!bestCandidate) {
    return continuity ? "REJECT" : "REJECT";
  }

  if (!continuity) {
    return "IGNORE";
  }

  const aligned = candidateAlignsWithContext(
    bestCandidate,
    memoryHints,
    history,
    message
  );

  if (!aligned) {
    return "IGNORE";
  }

  if (recallQuestion && stability !== "unstable") {
    return "ACCEPT";
  }

  if (recallQuestion && stability === "unstable") {
    return "ACCEPT";
  }

  if (stability === "stable" && containsDeicticReference(message)) {
    return "ACCEPT";
  }

  if (stability === "mixed") {
    return "REJECT";
  }

  return "IGNORE";
}

function directActionFromCandidate(input: {
  message: string;
  base: EventKernelState;
  candidate: MemoryHintCandidate;
  dominantProb: number;
  note: string;
}): KernelIntentDecision {
  const business = hasBusinessAttribute(input.message, input.base.frame.modifiers);
  return {
    intent: "DIRECT_ACTION",
    state: "DIRECT_ACTION",
    route: business ? "BUSINESS_LOOKUP" : "GENERAL_SEARCH",
    confidence: Math.max(input.dominantProb, input.candidate.score * 0.5 + input.dominantProb * 0.5),
    canonical_query: buildRecalledCanonicalQuery(input.candidate.entity, null),
    notes: input.note,
  };
}

/**
 * §2 KERNEL — sole decider (PATCH 1–2).
 * Memory hints are advisory; KERNEL owns accept / reject / ignore.
 */
export function decideKernelIntent(input: DecideKernelIntentInput): KernelIntentDecision {
  const message = input.message.trim();
  const base = input.base;
  const dominantProb = base.microIntentDistribution[base.dominantIntent];
  const bestCandidate = input.memoryHints.candidates[0] ?? null;

  if (isAckType(message)) {
    const previous = classifyPreviousTurnIntent(input.history, message);
    const continuesFlow =
      previous === "QUESTION" ||
      previous === "PROPOSAL" ||
      previous === "ACTION_OFFER" ||
      base.dominantIntent === "CONTINUE";

    if (continuesFlow) {
      return {
        intent: "CONTINUE",
        state: "CONTINUE",
        route: "DELEGATE_CONTINUE",
        confidence: Math.max(0.75, dominantProb),
        notes: `ack_as_continue:${previous.toLowerCase()}`,
      };
    }

    return {
      intent: "TERMINAL_ACK",
      state: "TERMINAL_ACK",
      route: "TERMINAL_ACK",
      confidence: Math.max(0.7, dominantProb),
      notes: "standalone_ack",
    };
  }

  // STEP 2 — ACTION REQUEST wins over entropy / CLARIFY downgrades.
  if (isActionRequest(message, base)) {
    return directActionFromRequest({
      message,
      base,
      dominantProb,
      note: "action_request",
    });
  }

  if (containsDeicticReference(message)) {
    const resolution = evaluateDeicticResolution({
      base,
      message,
      history: input.history,
      memoryHints: input.memoryHints,
      bestCandidate,
    });

    if (resolution === "ACCEPT" && bestCandidate) {
      return directActionFromCandidate({
        message,
        base,
        candidate: bestCandidate,
        dominantProb,
        note: `kernel_accept:${bestCandidate.source}`,
      });
    }

    if (resolution === "REJECT") {
      return {
        intent: "CLARIFY",
        state: "CLARIFY_A",
        route: "CLARIFY",
        confidence: Math.max(0.65, base.entropy),
        notes: bestCandidate
          ? `kernel_reject:${bestCandidate.source}`
          : "deictic_unresolved",
      };
    }

    // IGNORE — fall through; memory hint treated as noise
  }

  // STEP 3 — CLARIFY only when no actionable intent was detected above.
  if (base.committedDecision === "CLARIFY") {
    return {
      intent: "CLARIFY",
      state: base.entropy >= ENTROPY_OPTIONS_THRESHOLD ? "CLARIFY_B" : "CLARIFY_A",
      route: "CLARIFY",
      confidence: Math.max(base.entropy, dominantProb),
      notes: "kernel_entropy_clarify",
    };
  }

  if (
    base.committedDecision === "DIRECT_ACTION" &&
    (base.dominantIntent === "QUERY" || base.dominantIntent === "SHIFT")
  ) {
    const entity = base.frame.entities[0] ?? null;
    const business = hasBusinessAttribute(message, base.frame.modifiers);

    return {
      intent: "DIRECT_ACTION",
      state: "DIRECT_ACTION",
      route: business ? "BUSINESS_LOOKUP" : "GENERAL_SEARCH",
      confidence: Math.max(0.72, dominantProb),
      canonical_query: buildCanonicalQuery(message, entity, base.frame.modifiers),
      notes: business ? "entity_attribute" : "explicit_query",
    };
  }

  if (base.dominantIntent === "CONTINUE") {
    return {
      intent: "CONTINUE",
      state: "CONTINUE",
      route: "DELEGATE_CONTINUE",
      confidence: Math.max(0.7, dominantProb),
      notes: "kernel_continue",
    };
  }

  if (base.dominantIntent === "ACK") {
    return {
      intent: "ACK",
      state: "ACK",
      route: "TERMINAL_ACK",
      confidence: Math.max(0.7, dominantProb),
      notes: "kernel_ack",
    };
  }

  if (base.dominantIntent === "CLOSE" || base.dominantIntent === "PASSIVE") {
    return {
      intent: "TERMINAL_ACK",
      state: "TERMINAL_ACK",
      route: "TERMINAL_ACK",
      confidence: Math.max(0.7, dominantProb),
      notes: `kernel_${base.dominantIntent.toLowerCase()}`,
    };
  }

  if (base.committedDecision === "OPTIONS" && !isActionRequest(message, base)) {
    return {
      intent: "CLARIFY",
      state: "CLARIFY_B",
      route: "CLARIFY",
      confidence: base.entropy,
      notes: "kernel_options",
    };
  }

  return {
    intent: "CONTINUE",
    state: "CONTINUE",
    route: "HOLD",
    confidence: dominantProb,
    notes: "default_hold",
  };
}

export function kernelDecisionToRoute(state: KernelFinalState): KernelRouteType {
  switch (state) {
    case "DIRECT_ACTION":
      return "GENERAL_SEARCH";
    case "CONTINUE":
      return "DELEGATE_CONTINUE";
    case "CLARIFY_A":
    case "CLARIFY_B":
      return "CLARIFY";
    case "TERMINAL_ACK":
    case "ACK":
      return "TERMINAL_ACK";
    default:
      return "HOLD";
  }
}
