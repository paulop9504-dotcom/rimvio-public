import type {
  PolicyClassification,
  PolicyPersona,
  PolicyWire,
} from "@/lib/policy/types";
import type { VitalityTag } from "@/lib/vitality/types";

export type ContentPolicyDecision = {
  classification: PolicyClassification;
  persona?: PolicyPersona;
  redirect_tag?: VitalityTag;
  refuse_reason_code?: string;
};

const UNSAFE_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /(?:폭탄|독가스|총기)\s*(?:만드|제조|하는\s*법)/iu, code: "WEAPONS" },
  { pattern: /(?:자살|자해)\s*(?:방법|하는\s*법|유도)/iu, code: "SELF_HARM" },
  { pattern: /(?:아동|미성년).*(?:성|포르노|노출)/iu, code: "CSAM" },
  { pattern: /(?:마약|대마|필로폰|코카인)\s*(?:구매|판매|유통)/iu, code: "DRUGS" },
  { pattern: /(?:신용카드|계좌)\s*(?:탈취|해킹|도용)/iu, code: "FRAUD" },
];

const BORDERLINE_PATTERNS: Array<{ pattern: RegExp; redirect_tag: VitalityTag }> = [
  { pattern: /(?:18금|19금|야한|선정적|성인\s*용|섹시)/iu, redirect_tag: "Haven" },
  { pattern: /(?:플러팅|썸\s*연습|고백\s*연습|유혹)/iu, redirect_tag: "Nexus" },
  { pattern: /(?:이상한|어색한)\s*(?:질문|말|대화)/iu, redirect_tag: "Haven" },
  { pattern: /(?:심심|재미).*(?:야한|19금|성인)/iu, redirect_tag: "Haven" },
];

function inferPersona(message: string): PolicyPersona {
  if (/ㅋ|ㅎ|장난|재밌|witty|funny/i.test(message)) {
    return "WITTY";
  }
  if (/귀여|쫑알|애교/i.test(message)) {
    return "CUTE";
  }
  return "NEUTRAL";
}

/** Rule-first classifier — SAFE returns null (pass-through). */
export function classifyContentPolicy(message: string): ContentPolicyDecision | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  for (const entry of UNSAFE_PATTERNS) {
    if (entry.pattern.test(trimmed)) {
      return {
        classification: "UNSAFE",
        persona: "NEUTRAL",
        redirect_tag: "Haven",
        refuse_reason_code: entry.code,
      };
    }
  }

  for (const entry of BORDERLINE_PATTERNS) {
    if (entry.pattern.test(trimmed)) {
      return {
        classification: "BORDERLINE",
        persona: inferPersona(trimmed),
        redirect_tag: entry.redirect_tag,
      };
    }
  }

  return null;
}

export function decisionToPolicyAction(
  decision: ContentPolicyDecision
): PolicyWire["policy_action"] {
  if (decision.classification === "UNSAFE") {
    return "REFUSE";
  }
  if (decision.classification === "BORDERLINE") {
    return "DEFLECT";
  }
  return "PASS";
}
