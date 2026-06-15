import type {
  IntentEvidence,
  IntentScoreboard,
  IntentScoreEntry,
} from "@/lib/experience-intent/experience-intent-types";
import { EXPERIENCE_INTENTS } from "@/lib/experience-intent/experience-intent-types";
import {
  INTENT_SIGNAL_REGISTRY,
  type IntentSignalRule,
} from "@/lib/experience-intent/intent-signal-registry";
import type { IntentScorerInput } from "@/lib/experience-intent/intent-scorer-input";

function applyRule(
  rule: IntentSignalRule,
  input: IntentScorerInput,
): IntentEvidence | null {
  if (!rule.test(input)) {
    return null;
  }
  return {
    kind: rule.kind,
    signal: rule.label,
    weight: rule.weight,
    source: `intent-signal-registry:${rule.id}`,
  };
}

function scoreIntent(
  input: IntentScorerInput,
  intent: (typeof EXPERIENCE_INTENTS)[number],
): IntentScoreEntry {
  const spec = INTENT_SIGNAL_REGISTRY.find((row) => row.intent === intent);
  if (!spec) {
    return { intent, score: 0, evidence: [] };
  }

  const evidence: IntentEvidence[] = [];
  let score = 0;

  for (const rule of spec.rules) {
    const match = applyRule(rule, input);
    if (match) {
      evidence.push(match);
      score += match.weight;
    }
  }

  return {
    intent,
    score: Math.max(0, score),
    evidence,
  };
}

/** Evaluate all intents — evidence voting scoreboard. */
export function scoreIntentEvidence(input: IntentScorerInput): IntentScoreboard {
  const entries = EXPERIENCE_INTENTS.map((intent) => scoreIntent(input, intent)).sort(
    (left, right) => right.score - left.score,
  );

  const winner = entries[0]!;
  const runnerUp = entries.length > 1 ? entries[1]! : null;

  return { entries, winner, runnerUp };
}
