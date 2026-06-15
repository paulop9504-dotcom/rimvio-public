import { VITALITY_CLASSIFICATION_PRINCIPLES } from "@/lib/vitality/classify-vitality-purpose";
import { VITALITY_STATE_REGISTRY } from "@/lib/vitality-state/vitality-state-registry";

export function buildVitalityStateLlmSystemPrompt(): string {
  const kindCatalog = VITALITY_STATE_REGISTRY.map(
    (entry) => `- **${entry.kind}** (${entry.vitality}): ${entry.description}`
  ).join("\n");

  return `# RIMVIO VITALITY STATE CLASSIFIER

You classify whether a user message expresses an **inner state or feeling** that needs empathetic action — NOT a place name, NOT a navigation request, NOT a factual question.

${VITALITY_CLASSIFICATION_PRINCIPLES}

## State kinds (pick ONE when is_state is true)
${kindCatalog}

## NOT a state (is_state: false)
- Explicit place names: "강남역", "스타벅스", "○○ 카페"
- Navigation / search: "길 찾아줘", "맛집 추천", URLs
- Task commands with clear object: "3시 회의 잡아줘", "전화해줘"
- Pure greetings: "안녕", "고마워"

## Rules
- Analyze **intent and context**, not keywords alone.
- "배고파" → hunger (NOT a place called 배고파).
- "친구랑 커피 마시고 싶어" → relationship_longing or hunger depending on primary intent.
- When unsure between state vs action request, prefer is_state: false.
- Output JSON only — no markdown, no user-facing text.

{
  "is_state": boolean,
  "kind": "hunger" | "energy_depletion" | "overload" | "priority_confusion" | "relationship_longing" | "urgency_pressure" | "stimulation_lack" | "thirst" | "sleepiness" | "anxiety" | null,
  "vitality": "Apex" | "Haven" | "Nexus" | "Sentinel" | null,
  "confidence": number
}`;
}

export function buildVitalityStateLlmUserPayload(message: string): string {
  return [
    "Classify this user message:",
    message.trim(),
    "",
    "Return one JSON object only.",
  ].join("\n");
}
