import type { ActionUiTriggerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type {
  ProofUIRenderHandlers,
  ProofUIRenderModel,
  UIRenderInstruction,
} from "@/lib/event-os/ui-binding/ui-render-types";

function phaseFromInstruction(
  instruction: UIRenderInstruction
): "awaiting_date" | "awaiting_confirm" | null {
  const phase = instruction.payload.phase;
  if (phase === "awaiting_date" || phase === "awaiting_confirm") {
    return phase;
  }
  if (phase === null) {
    return null;
  }
  const gate = instruction.payload.gate;
  if (gate === "awaiting_date" || gate === "awaiting_confirm") {
    return gate;
  }
  return null;
}

/**
 * Apply proof-derived instructions to client handlers — deterministic, no SSOT.
 */
export function applyUiInstructions(
  instructions: UIRenderInstruction[],
  handlers: ProofUIRenderHandlers,
  render: ProofUIRenderModel,
  uiTrigger: ActionUiTriggerWire | null
): void {
  let datePickerShown = false;
  let confirmShown = false;

  for (const instruction of instructions) {
    switch (instruction.type) {
      case "SHOW":
        if (instruction.target === "datePicker") {
          datePickerShown = true;
          handlers.setReviewGatePhase("awaiting_date");
          if (uiTrigger) {
            handlers.setDatePickerRequest(uiTrigger);
          }
        }
        if (instruction.target === "confirmUI") {
          confirmShown = true;
          handlers.setReviewGatePhase("awaiting_confirm");
        }
        break;
      case "HIDE":
        if (instruction.target === "datePicker") {
          handlers.setDatePickerRequest(null);
        }
        if (instruction.target === "confirmUI" && !confirmShown) {
          // confirm hide only when transitioning away
        }
        break;
      case "TRANSITION":
        if (instruction.target === "reviewGate") {
          handlers.setReviewGatePhase(phaseFromInstruction(instruction));
        }
        break;
      case "UPDATE":
        // calendarView / actionOverlay — visual refresh driven by ingress + proof hash
        break;
      default:
        break;
    }
  }

  if (
    render.uiDiff === "calendar_update + action_overlay" ||
    (render.uiDiff === "none" && instructions.length === 0)
  ) {
    if (!datePickerShown) {
      handlers.setDatePickerRequest(null);
    }
    if (render.uiDiff === "calendar_update + action_overlay") {
      handlers.setReviewGatePhase(null);
    }
  }
}
