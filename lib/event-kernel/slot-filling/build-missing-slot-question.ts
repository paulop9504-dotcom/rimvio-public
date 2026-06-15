import { ACTION_CONTRACT_SLOTS } from "@/lib/event-kernel/action-contracts/action-contract-registry";

export type BuildMissingSlotQuestionInput = {
  action: string;
  missingSlots: string[];
};

const ACTION_SLOT_QUESTIONS: Readonly<
  Record<string, Readonly<Partial<Record<string, string>>>>
> = {
  NAVIGATE: {
    [ACTION_CONTRACT_SLOTS.destination]: "어디로 가시나요?",
  },
  PRICE_LOOKUP: {
    [ACTION_CONTRACT_SLOTS.entity]: "무엇의 가격을 찾으시나요?",
  },
  WEATHER: {
    [ACTION_CONTRACT_SLOTS.location]: "어느 지역 날씨를 확인할까요?",
  },
};

const SLOT_FALLBACK_QUESTIONS: Readonly<Record<string, string>> = {
  [ACTION_CONTRACT_SLOTS.destination]: "어디로 가시나요?",
  [ACTION_CONTRACT_SLOTS.entity]: "무엇을 말씀하시는지 알려주세요.",
  [ACTION_CONTRACT_SLOTS.location]: "어느 지역인지 알려주세요.",
};

function questionForSlot(action: string, slot: string): string {
  const key = action.trim();
  const mapped = ACTION_SLOT_QUESTIONS[key]?.[slot];
  if (mapped) {
    return mapped;
  }

  const fallback = SLOT_FALLBACK_QUESTIONS[slot];
  if (fallback) {
    return fallback;
  }

  return `${slot}을(를) 알려주세요.`;
}

/**
 * Builds a human-friendly clarifying question for missing contract slots.
 * Question generation only — no execution or kernel coupling.
 */
export function buildMissingSlotQuestion(
  input: BuildMissingSlotQuestionInput
): string {
  const slots = input.missingSlots
    .map((slot) => slot.trim())
    .filter(Boolean);

  if (slots.length === 0) {
    return "";
  }

  const parts: string[] = [];
  const seen = new Set<string>();

  for (const slot of slots) {
    const question = questionForSlot(input.action, slot);
    if (!seen.has(question)) {
      seen.add(question);
      parts.push(question);
    }
  }

  return parts.join(" ");
}
