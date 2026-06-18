import type { ContentPolicyDecision } from "@/lib/policy/classify-content-policy";
import type {
  PolicyAction,
  PolicyClassification,
  PolicyPersona,
} from "@/lib/policy/types";
import { isVitalityTag, type VitalityTag } from "@/lib/vitality/types";

const CLASSIFICATIONS: PolicyClassification[] = ["SAFE", "BORDERLINE", "UNSAFE"];
const ACTIONS: PolicyAction[] = ["PASS", "DEFLECT", "REFUSE"];
const PERSONAS: PolicyPersona[] = ["CUTE", "WITTY", "NEUTRAL"];

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickEnum<T extends string>(value: unknown, allowed: T[]): T | null {
  const normalized = asString(value).toUpperCase();
  const hit = allowed.find((entry) => entry.toUpperCase() === normalized);
  return hit ?? null;
}

function pickVitalityTag(value: unknown): VitalityTag | undefined {
  const raw = asString(value);
  if (!raw) {
    return undefined;
  }
  const normalized =
    raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return isVitalityTag(normalized) ? normalized : undefined;
}

/** Parse LLM JSON wire → decision. SAFE/PASS returns null (pass-through). */
export function parsePolicyLlmWire(raw: string): ContentPolicyDecision | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const classification = pickEnum(parsed.classification, CLASSIFICATIONS);
    const policy_action = pickEnum(parsed.policy_action, ACTIONS);

    if (!classification || !policy_action) {
      return null;
    }

    if (classification === "SAFE" || policy_action === "PASS") {
      return null;
    }

    const persona = pickEnum(parsed.persona, PERSONAS) ?? "NEUTRAL";
    const redirect_tag = pickVitalityTag(parsed.redirect_tag) ?? "Haven";
    const refuse_reason_code = asString(parsed.refuse_reason_code) || undefined;

    return {
      classification,
      persona,
      redirect_tag,
      refuse_reason_code,
    };
  } catch {
    return null;
  }
}
