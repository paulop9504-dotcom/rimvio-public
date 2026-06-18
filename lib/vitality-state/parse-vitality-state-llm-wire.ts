import type { VitalityStateMatch } from "@/lib/vitality-state/vitality-state-types";
import {
  isVitalityStateKind,
  resolveVitalityStateFromKind,
} from "@/lib/vitality-state/vitality-state-registry";
import { isVitalityTag, type VitalityTag } from "@/lib/vitality/types";

function asBool(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  return 0.7;
}

function pickVitality(value: unknown): VitalityTag | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return null;
  }
  const normalized =
    raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return isVitalityTag(normalized) ? normalized : null;
}

/** Parse LLM JSON wire → VitalityStateMatch. Returns null when not a state utterance. */
export function parseVitalityStateLlmWire(raw: string): VitalityStateMatch | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!asBool(parsed.is_state)) {
      return null;
    }

    const kindRaw = typeof parsed.kind === "string" ? parsed.kind.trim() : "";
    if (!kindRaw || !isVitalityStateKind(kindRaw)) {
      return null;
    }

    const confidence = asNumber(parsed.confidence);
    const resolved = resolveVitalityStateFromKind(kindRaw, confidence);
    if (!resolved) {
      return null;
    }

    const vitalityOverride = pickVitality(parsed.vitality);
    if (vitalityOverride && vitalityOverride !== resolved.vitality) {
      return { ...resolved, vitality: vitalityOverride };
    }

    return resolved;
  } catch {
    return null;
  }
}
