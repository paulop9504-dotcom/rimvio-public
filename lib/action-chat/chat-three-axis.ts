/** MVP chat scope — decision / meal / schedule (hit-and-run gates). */

export type ChatAxis = "decision" | "meal" | "schedule";

export const CHAT_AXIS_ORDER: ChatAxis[] = ["decision", "meal", "schedule"];

export const CHAT_AXIS_STORAGE_KEY = "rimvio.chat.axis.v1";

export type ChatAxisConfig = {
  id: ChatAxis;
  label: string;
  hint: string;
  placeholder: string;
};

export const CHAT_AXIS_CONFIG: Record<ChatAxis, ChatAxisConfig> = {
  decision: {
    id: "decision",
    label: "고민",
    hint: "선택 · 판단",
    placeholder: "뭐하지, 이거 사도 돼?, A vs B…",
  },
  meal: {
    id: "meal",
    label: "밥",
    hint: "뭐 먹지 · 맛집",
    placeholder: "오늘 뭐 먹지, 근처 맛집, 배고파…",
  },
  schedule: {
    id: "schedule",
    label: "일정",
    hint: "약속 · 재조정",
    placeholder: "일정 겹침, 내일 뭐 있지, 다시 짜줘…",
  },
};

export function isChatAxis(value: string | null | undefined): value is ChatAxis {
  return value === "decision" || value === "meal" || value === "schedule";
}

export function readStoredChatAxis(): ChatAxis {
  if (typeof window === "undefined") {
    return "decision";
  }
  try {
    const raw = window.sessionStorage.getItem(CHAT_AXIS_STORAGE_KEY);
    return isChatAxis(raw) ? raw : "decision";
  } catch {
    return "decision";
  }
}

export function writeStoredChatAxis(axis: ChatAxis): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(CHAT_AXIS_STORAGE_KEY, axis);
  } catch {
    // ignore quota / private mode
  }
}

/** Meal-tab: “뭐하지/추천” = food ambiguity, not generic decision. */
export function isMealAxisAmbiguousPhrase(message: string): boolean {
  return /^(?:뭐\s*하지|추천|뭐\s*먹|배고(?:파|픈)?)$/iu.test(message.trim());
}

export function isScheduleAxisQuery(message: string): boolean {
  return /(?:일정|스케줄|약속|캘린더|내일|모레|겹|재조정|미루|바쁜)/u.test(message);
}

export function isMealAxisQuery(message: string): boolean {
  return (
    /(?:먹|맛집|배고|점심|저녁|아침|메뉴|배달|식당|브런치)/u.test(message) ||
    isMealAxisAmbiguousPhrase(message)
  );
}
