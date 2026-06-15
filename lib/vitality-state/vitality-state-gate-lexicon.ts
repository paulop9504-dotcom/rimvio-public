import type { VitalityStateKind } from "@/lib/vitality-state/vitality-state-types";

type GateStem = {
  kind: VitalityStateKind;
  /** Full utterance or short phrase — aligned with VITALITY_STATE_REGISTRY examples. */
  pattern: RegExp;
};

/**
 * Sync gate stems for inner-state utterances.
 * LLM classifies the exact kind; this only blocks entity/place/kernel swallow paths.
 */
const VITALITY_GATE_STEMS: GateStem[] = [
  { kind: "hunger", pattern: /^(?:배고(?:파|프|픈|픔)|먹고\s*싶|밥\s*뭐\s*먹)/iu },
  { kind: "sleepiness", pattern: /^(?:졸려|잠\s*와|잠\s*온)/iu },
  {
    kind: "energy_depletion",
    pattern: /^(?:피곤(?:해|함)?|지쳤|녹초|쉬고\s*싶)/iu,
  },
  {
    kind: "overload",
    pattern: /^(?:스트레스|과부하|머리\s*아파|한계|미칠\s*것)/iu,
  },
  {
    kind: "priority_confusion",
    pattern: /^(?:막막(?:해)?|정신\s*없|뭐(?:부터|를)\s*해)/iu,
  },
  {
    kind: "relationship_longing",
    pattern: /^(?:외로(?:워|움)?|보고\s*싶|연락하고\s*싶)/iu,
  },
  {
    kind: "urgency_pressure",
    pattern: /^(?:시간이\s*없|망했|늦었|바빠\s*죽)/iu,
  },
  {
    kind: "stimulation_lack",
    pattern: /^(?:심심(?:해)?|뭐\s*하지|할\s*게\s*없)/iu,
  },
  { kind: "thirst", pattern: /^(?:목말(?:라|림)|갈증)/iu },
  { kind: "anxiety", pattern: /^(?:불안(?:해)?|걱정(?:돼|됨)?|초조)/iu },
];

function normalizeGateText(message: string): string {
  return message.trim().replace(/[!?.~ㅋㅎㅠㅜ\s]+$/u, "").trim();
}

/** Registry-aligned kind when sync gate matches — used for offline LLM fallback. */
export function matchVitalityGateLexicon(message: string): VitalityStateKind | null {
  const trimmed = normalizeGateText(message);
  if (!trimmed) {
    return null;
  }
  for (const stem of VITALITY_GATE_STEMS) {
    if (stem.pattern.test(trimmed)) {
      return stem.kind;
    }
  }
  return null;
}

export function isVitalityGateLexiconMatch(message: string): boolean {
  return matchVitalityGateLexicon(message) !== null;
}
