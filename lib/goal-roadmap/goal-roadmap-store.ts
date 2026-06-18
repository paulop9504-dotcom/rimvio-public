export type UserGoalKind = "revenue" | "certification" | "custom";

export type UserGoal = {
  id: string;
  kind: UserGoalKind;
  label: string;
  targetValue?: number;
  unit?: string;
  deadline?: string;
  studyHoursPerWeek?: number;
  vitalityHint?: "Apex" | "Haven" | "Nexus" | "Sentinel";
  createdAt: string;
  updatedAt: string;
};

export type UserGoalWire = Pick<
  UserGoal,
  | "id"
  | "kind"
  | "label"
  | "targetValue"
  | "unit"
  | "deadline"
  | "studyHoursPerWeek"
  | "vitalityHint"
>;

const STORAGE_KEY = "rimvio-user-goals";
let memoryGoals: UserGoal[] = [];

export function resetUserGoalsForTests(items: UserGoal[] = []) {
  memoryGoals = items;
}

function readJson(): UserGoal[] {
  if (typeof window === "undefined") {
    return [...memoryGoals];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as UserGoal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(items: UserGoal[]) {
  if (typeof window === "undefined") {
    memoryGoals = items;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listUserGoals(): UserGoal[] {
  return readJson().sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

export function serializeUserGoalsForApi(): UserGoalWire[] {
  return listUserGoals().map((item) => ({
    id: item.id,
    kind: item.kind,
    label: item.label,
    targetValue: item.targetValue,
    unit: item.unit,
    deadline: item.deadline,
    studyHoursPerWeek: item.studyHoursPerWeek,
    vitalityHint: item.vitalityHint,
  }));
}

export function upsertUserGoal(input: Omit<UserGoal, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
}): UserGoal {
  const now = new Date().toISOString();
  const existing = input.id ? readJson().find((item) => item.id === input.id) : null;
  const next: UserGoal = {
    id: input.id ?? `goal-${crypto.randomUUID()}`,
    kind: input.kind,
    label: input.label.trim(),
    targetValue: input.targetValue,
    unit: input.unit,
    deadline: input.deadline,
    studyHoursPerWeek: input.studyHoursPerWeek,
    vitalityHint: input.vitalityHint,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const merged = [next, ...readJson().filter((item) => item.id !== next.id)];
  writeJson(merged);
  return next;
}

export function extractGoalFromMessage(message: string): UserGoal | null {
  if (typeof window === "undefined") {
    return null;
  }

  const trimmed = message.trim();
  const revenue = trimmed.match(/(?:수익|매출)\s*(?:목표)?\s*(\d+)\s*만\s*원/u);
  if (revenue) {
    const target = Number.parseInt(revenue[1]!, 10) * 10_000;
    const monthMatch = trimmed.match(/(\d{1,2})월/u);
    const deadline = monthMatch
      ? `${new Date().getFullYear()}-${String(Number.parseInt(monthMatch[1]!, 10)).padStart(2, "0")}-28`
      : undefined;
    return upsertUserGoal({
      kind: "revenue",
      label: "월 수익 목표",
      targetValue: target,
      unit: "원",
      deadline,
      vitalityHint: "Apex",
    });
  }

  const cert = trimmed.match(/(?:내년\s*)?(\d{1,2})월\s*(?:까지\s*)?([가-힣A-Za-z0-9\s]{0,16})?자격증/u);
  if (cert) {
    const month = Number.parseInt(cert[1]!, 10);
    const year = /내년/u.test(trimmed) ? new Date().getFullYear() + 1 : new Date().getFullYear();
    return upsertUserGoal({
      kind: "certification",
      label: cert[2]?.trim() ? `${cert[2].trim()} 자격증` : "자격증 취득",
      deadline: `${year}-${String(month).padStart(2, "0")}-30`,
      studyHoursPerWeek: /2\s*종|두\s*종/u.test(trimmed) ? 8 : 5,
      vitalityHint: "Apex",
    });
  }

  return null;
}

export function goalsFromWire(goals: UserGoalWire[] | undefined): UserGoal[] {
  if (!goals?.length) {
    return [];
  }
  return goals.map((item) => ({
    ...item,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}
