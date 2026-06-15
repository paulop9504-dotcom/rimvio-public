import type { VitalityStateKind } from "@/lib/vitality-state/vitality-state-types";
import { matchVitalityGateLexicon } from "@/lib/vitality-state/vitality-state-gate-lexicon";

type CompoundSignal = {
  kind: VitalityStateKind;
  pattern: RegExp;
};

/** Compound utterances — not anchored to line-start gate lexicon. */
const COMPOUND_VITALITY: CompoundSignal[] = [
  { kind: "hunger", pattern: /(?:배고(?:파|픈|픔)|먹고\s*싶|밥\s*뭐)/iu },
  { kind: "sleepiness", pattern: /(?:졸려|잠\s*와|잠\s*온)/iu },
  { kind: "energy_depletion", pattern: /(?:피곤|지쳤|녹초)/iu },
  { kind: "overload", pattern: /(?:스트레스|과부하|머리\s*아파|한계|복잡)/iu },
  { kind: "anxiety", pattern: /(?:불안|걱정|초조)/iu },
  { kind: "priority_confusion", pattern: /(?:막막|정신\s*없|뭐(?:부터|를))/iu },
  { kind: "stimulation_lack", pattern: /(?:심심|할\s*게\s*없)/iu },
  { kind: "urgency_pressure", pattern: /(?:바빠|시간\s*없|급해)/iu },
];

export function detectVitalitySignals(message: string): VitalityStateKind[] {
  const trimmed = message.trim();
  const found = new Set<VitalityStateKind>();

  const gate = matchVitalityGateLexicon(trimmed);
  if (gate) {
    found.add(gate);
  }

  for (const signal of COMPOUND_VITALITY) {
    if (signal.pattern.test(trimmed)) {
      found.add(signal.kind);
    }
  }

  return [...found];
}
