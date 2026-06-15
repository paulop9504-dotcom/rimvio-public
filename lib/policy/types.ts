import type { VitalityTag } from "@/lib/vitality/types";

export type PolicyClassification = "SAFE" | "BORDERLINE" | "UNSAFE";

export type PolicyAction = "PASS" | "DEFLECT" | "REFUSE";

export type PolicyPersona = "CUTE" | "WITTY" | "NEUTRAL";

export type PolicyRedirectOption = {
  label: string;
  /** User message sent when the chip is tapped — re-enters orchestrator. */
  prompt: string;
};

export type PolicyWire = {
  classification: PolicyClassification;
  policy_action: PolicyAction;
  persona?: PolicyPersona;
  redirect_tag?: VitalityTag;
  refuse_reason_code?: string;
  /** Resolved copy — site registry, not LLM prose. */
  message: string;
  redirect_title: string;
  options: PolicyRedirectOption[];
};

export function isPolicyIntercept(wire?: PolicyWire | null): wire is PolicyWire {
  return Boolean(wire?.policy_action && wire.policy_action !== "PASS");
}
