export type ConfirmMessageCategory = "PLACE" | "TIME" | "CONTACT" | "OTHER";

export type PersonaConfirmInput = {
  locationLabel: string;
  category?: ConfirmMessageCategory;
  hasBatchPending?: boolean;
  referenceDate?: string;
  /** Stable seed for tests; omit for time+location hash */
  seed?: number;
};

const MAX_PERSONA_LEN = 72;

const PLACE_TEMPLATES = [
  (location: string) => `${location} 말씀이시죠? 좋습니다. 바로 챙겨드릴게요.`,
  (location: string) => `${location}로 확인했어요. 같이 진행할까요?`,
  (location: string) => `${location}군요! 일정도 함께 볼게요.`,
] as const;

const PLACE_WITH_PENDING_TEMPLATES = [
  (location: string) => `${location} 말씀이시죠? 좋습니다. 확인 후 나머지도 이어갈게요.`,
  (location: string) => `${location} 먼저 맞출게요. 다른 작업은 바로 이어서 처리할게요.`,
  (location: string) => `${location} 확인하고, 일정·연락처도 챙겨드릴게요.`,
] as const;

const EVENING_TEMPLATES = [
  (location: string) => `${location} 말씀이시죠? 좋습니다. 오늘 일정에 담을게요.`,
  (location: string) => `${location}로 진행할게요.`,
] as const;

function hashLabel(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function readHourBucket(referenceDate?: string) {
  const date = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
  const hour = date.getHours();
  if (hour >= 18) {
    return "evening";
  }
  if (hour >= 12) {
    return "afternoon";
  }
  return "morning";
}

function trimConcise(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= MAX_PERSONA_LEN) {
    return cleaned;
  }
  return `${cleaned.slice(0, MAX_PERSONA_LEN - 1)}…`;
}

function pickTemplate<T extends readonly ((location: string) => string)[]>(
  templates: T,
  locationLabel: string,
  seed: number
) {
  const index = seed % templates.length;
  return templates[index]!(locationLabel);
}

/**
 * Persona-driven confirm opener — concise, warm, slightly varied.
 */
export function generatePersonaConfirmMessage(input: PersonaConfirmInput): string {
  const location = input.locationLabel.trim().slice(0, 28) || "이 장소";
  const seed =
    input.seed ??
    hashLabel(`${location}:${input.referenceDate ?? ""}:${readHourBucket(input.referenceDate)}`);

  let message: string;

  if (input.hasBatchPending) {
    message = pickTemplate(PLACE_WITH_PENDING_TEMPLATES, location, seed);
  } else if (readHourBucket(input.referenceDate) === "evening" && seed % 3 === 0) {
    message = pickTemplate(EVENING_TEMPLATES, location, seed);
  } else {
    message = pickTemplate(PLACE_TEMPLATES, location, seed);
  }

  return trimConcise(message);
}

/** Short system-facing prompt on the data card (not persona). */
export function generateConfirmDataPrompt(category: ConfirmMessageCategory = "PLACE") {
  if (category === "TIME") {
    return "이 시간으로 진행할까요?";
  }
  if (category === "CONTACT") {
    return "이 연락처로 진행할까요?";
  }
  return "아래 정보로 진행할까요?";
}

export function buildConfirmMessageBundle(input: PersonaConfirmInput) {
  const category = input.category ?? "PLACE";
  return {
    persona_message: generatePersonaConfirmMessage(input),
    data_prompt: generateConfirmDataPrompt(category),
  };
}
