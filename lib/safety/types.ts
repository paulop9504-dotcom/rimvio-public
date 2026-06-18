import type { PersistentEvent } from "@/lib/context-resolver/types";

export type GuardrailActionType =
  | "DELETE"
  | "CANCEL"
  | "TRANSFER_FUNDS"
  | "BLOCK"
  | "EXECUTE";

export type EventCriticality = "LOW" | "MEDIUM" | "HIGH";

export type GuardrailUserIntent = {
  action: GuardrailActionType;
  action_description: string;
  event: PersistentEvent & { criticality: EventCriticality };
};

export type GuardrailDecision = "ALLOW" | "NEGOTIATE_WITH_EMPATHY";

export type GuardrailOptionAction =
  | "UPDATE_CALENDAR"
  | "DRAFT_EMAIL"
  | "POSTPONE"
  | "VERIFY_FIRST"
  | "KEEP_AND_NOTIFY"
  | string;

export type GuardrailOption = {
  label: string;
  action: GuardrailOptionAction;
};

export type GuardrailWire = {
  decision: GuardrailDecision;
  message_to_user: string;
  options: GuardrailOption[];
  risk_score: number;
  action: GuardrailActionType;
  event_criticality: EventCriticality;
};

export const GUARDRAIL_RISK_THRESHOLD = 80;

export function isGuardrailNegotiation(
  decision?: GuardrailDecision | null
): decision is "NEGOTIATE_WITH_EMPATHY" {
  return decision === "NEGOTIATE_WITH_EMPATHY";
}
