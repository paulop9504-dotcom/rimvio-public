import type { UiDiff } from "@/lib/event-os/causal-trace-types";
import type { UIRenderInstruction } from "@/lib/event-os/ui-binding/ui-render-types";

/**
 * uiDiff parser — deterministic proof.uiDiff → render instructions.
 * UI = f(CausalProof.uiDiff); no implicit transitions.
 */
export function translateUiDiff(uiDiff: UiDiff): UIRenderInstruction[] {
  switch (uiDiff) {
    case "show DATE_PICKER":
      return [
        {
          type: "SHOW",
          target: "datePicker",
          payload: { gate: "awaiting_date" },
        },
        {
          type: "TRANSITION",
          target: "reviewGate",
          payload: { phase: "awaiting_date" },
        },
      ];
    case "show CONFIRM_SCREEN":
      return [
        {
          type: "HIDE",
          target: "datePicker",
          payload: {},
        },
        {
          type: "SHOW",
          target: "confirmUI",
          payload: { gate: "awaiting_confirm" },
        },
        {
          type: "TRANSITION",
          target: "reviewGate",
          payload: { phase: "awaiting_confirm" },
        },
      ];
    case "calendar_update + action_overlay":
      return [
        {
          type: "HIDE",
          target: "datePicker",
          payload: {},
        },
        {
          type: "HIDE",
          target: "confirmUI",
          payload: {},
        },
        {
          type: "UPDATE",
          target: "calendarView",
          payload: { source: "proof_projection" },
        },
        {
          type: "UPDATE",
          target: "actionOverlay",
          payload: { source: "proof_projection" },
        },
        {
          type: "TRANSITION",
          target: "reviewGate",
          payload: { phase: null },
        },
      ];
    case "none":
    default:
      return [];
  }
}
