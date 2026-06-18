const COLD_START_KEY = "rimvio.cold-start-magic.v1";

export type ColdStartMagicState = {
  completed: boolean;
  scheduleSeedSent: boolean;
  diningSeedSent: boolean;
};

export const COLD_START_SCHEDULE_SEED = "내일 12:30 점심 약속 — 강남역";
export const COLD_START_DINING_SEED = "강남역 근처 떡반집 추천해줘";

function readState(): ColdStartMagicState {
  if (typeof window === "undefined") {
    return { completed: false, scheduleSeedSent: false, diningSeedSent: false };
  }

  try {
    const raw = localStorage.getItem(COLD_START_KEY);
    if (!raw) {
      return { completed: false, scheduleSeedSent: false, diningSeedSent: false };
    }
    const parsed = JSON.parse(raw) as Partial<ColdStartMagicState>;
    return {
      completed: parsed.completed === true,
      scheduleSeedSent: parsed.scheduleSeedSent === true,
      diningSeedSent: parsed.diningSeedSent === true,
    };
  } catch {
    return { completed: false, scheduleSeedSent: false, diningSeedSent: false };
  }
}

function writeState(state: ColdStartMagicState) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(COLD_START_KEY, JSON.stringify(state));
}

export function shouldShowColdStartMagic(input: {
  linkCount: number;
  userMessageCount: number;
}) {
  if (input.linkCount > 0 || input.userMessageCount > 0) {
    return false;
  }
  return !readState().completed;
}

export function markColdStartSeedSent(kind: "schedule" | "dining") {
  const current = readState();
  const next: ColdStartMagicState = {
    ...current,
    scheduleSeedSent: kind === "schedule" ? true : current.scheduleSeedSent,
    diningSeedSent: kind === "dining" ? true : current.diningSeedSent,
    completed:
      (kind === "schedule" ? true : current.scheduleSeedSent) &&
      (kind === "dining" ? true : current.diningSeedSent),
  };
  writeState(next);
  return next;
}

export function markColdStartComplete() {
  writeState({
    completed: true,
    scheduleSeedSent: true,
    diningSeedSent: true,
  });
}

export function readColdStartState() {
  return readState();
}
