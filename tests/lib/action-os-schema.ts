import type { DockUpdateWire } from "@/lib/action-os/types";
import type { ActionIntentWire } from "@/lib/action-dispatcher/types";
import type { RegisterActionWire } from "@/lib/action-os/types";

export type QaViolation = {
  scenario: string;
  message: string;
};

export function validateActionIntentWire(
  wire: ActionIntentWire,
  scenario: string
): QaViolation[] {
  const violations: QaViolation[] = [];

  if (!wire.action_id?.trim()) {
    violations.push({ scenario, message: "action_id is required" });
  }
  if (!wire.fallback_url?.startsWith("http")) {
    violations.push({ scenario, message: "fallback_url must be https/http" });
  }
  if (wire.params) {
    for (const value of Object.values(wire.params)) {
      if (/\b(.+\s+\1\b|\1\s+\1)/u.test(value)) {
        violations.push({
          scenario,
          message: `params contain duplicated phrase: ${value}`,
        });
      }
    }
  }

  return violations;
}

export function validateDockUpdateWire(wire: DockUpdateWire, scenario: string): QaViolation[] {
  const violations: QaViolation[] = [];

  if (!["MANUAL_CORE", "LEARNED_TEMPLATE", "DYNAMIC_INFERENCE"].includes(wire.strategy)) {
    violations.push({ scenario, message: `invalid strategy: ${wire.strategy}` });
  }
  if (!wire.main_action?.label?.trim()) {
    violations.push({ scenario, message: "main_action.label is required" });
  }
  if (wire.shadow_actions.length > 4) {
    violations.push({ scenario, message: "shadow_actions max is 4" });
  }
  for (const action of [wire.main_action, ...wire.shadow_actions]) {
    const exec = action.execution as { uri?: string; action_id?: string };
    if (exec.uri && /^(kakaot|kakaomap|supertoss):\/\//i.test(exec.uri) && exec.action_id) {
      violations.push({
        scenario,
        message: "LLM must not emit raw schemes when action_id is present",
      });
    }
  }

  return violations;
}

export function validateRegisterActionWire(
  wire: RegisterActionWire,
  scenario: string
): QaViolation[] {
  const violations: QaViolation[] = [];
  if (wire.action !== "REGISTER_ACTION") {
    violations.push({ scenario, message: "action must be REGISTER_ACTION" });
  }
  if (!wire.trigger_pattern.trim()) {
    violations.push({ scenario, message: "trigger_pattern is required" });
  }
  if (!wire.action_schema.label.trim()) {
    violations.push({ scenario, message: "action_schema.label is required" });
  }
  return violations;
}

export function formatViolations(violations: QaViolation[]): string {
  return violations.map((item) => `[${item.scenario}] ${item.message}`).join("\n");
}
