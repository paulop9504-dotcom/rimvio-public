import type { SmartSuite } from "@/lib/actions/smart-suite-types";

export const SUITE_TASTE_STORAGE_KEY = "rimvio.suite-taste.v1";
export const SUITE_TASTE_UPDATED = "rimvio-suite-taste-updated";
export const MAX_SUITE_TASTE = 2;

export const SUITE_TASTE_OPTIONS = [
  { suite: "finance" as const, label: "금융·투자", emoji: "💹" },
  { suite: "travel" as const, label: "여행·일정", emoji: "✈️" },
  { suite: "edu" as const, label: "학습·강의", emoji: "📚" },
  { suite: "decision" as const, label: "쇼핑·결정", emoji: "🛒" },
  { suite: "intellectual" as const, label: "뉴스·리서치", emoji: "📰" },
  { suite: "health" as const, label: "건강·운동", emoji: "💪" },
] as const;

const TASTE_SET = new Set<SmartSuite>(SUITE_TASTE_OPTIONS.map((item) => item.suite));

function isTasteSuite(value: string): value is SmartSuite {
  return TASTE_SET.has(value as SmartSuite);
}

export function readSuiteTaste(): SmartSuite[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(SUITE_TASTE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isTasteSuite).slice(0, MAX_SUITE_TASTE);
  } catch {
    return [];
  }
}

export function writeSuiteTaste(suites: SmartSuite[]): SmartSuite[] {
  const next = suites.filter(isTasteSuite).slice(0, MAX_SUITE_TASTE);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SUITE_TASTE_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(SUITE_TASTE_UPDATED));
    } catch {
      // ignore quota / private mode
    }
  }

  return next;
}

export function toggleSuiteTaste(suite: SmartSuite): SmartSuite[] {
  const current = readSuiteTaste();
  const index = current.indexOf(suite);

  if (index >= 0) {
    return writeSuiteTaste(current.filter((item) => item !== suite));
  }

  if (current.length >= MAX_SUITE_TASTE) {
    return writeSuiteTaste([...current.slice(1), suite]);
  }

  return writeSuiteTaste([...current, suite]);
}

export function labelForSuiteTaste(suite: SmartSuite) {
  return SUITE_TASTE_OPTIONS.find((item) => item.suite === suite)?.label ?? suite;
}
