import type {
  DeosCardState,
  StateTransitionRequest,
  StateValidationResult,
} from "@/lib/deos/decision/decision-contract-types";

const ALLOWED: Record<DeosCardState, DeosCardState[]> = {
  WAITING: ["WORKING", "DEFERRED"],
  WORKING: ["DONE", "WAITING"],
  DONE: ["WAITING"],
  DEFERRED: ["WAITING"],
};

/**
 * State = constraint system only. Never selects actions.
 */
export function validateStateTransition(
  request: StateTransitionRequest
): StateValidationResult {
  if (request.from === request.to && request.from === "DONE") {
    return { allowed: true };
  }
  const targets = ALLOWED[request.from] ?? [];
  if (!targets.includes(request.to)) {
    return {
      allowed: false,
      reason: `illegal_transition:${request.from}->${request.to}`,
    };
  }
  return { allowed: true };
}

export function validateSurfaceTransition(
  surface: import("@/lib/deos/decision/decision-contract-types").DecisionSurface
): StateValidationResult {
  if (surface.mode === "fork") {
    return { allowed: true };
  }
  if (surface.mode === "blocked") {
    return { allowed: true };
  }
  return validateStateTransition(surface.transition);
}
