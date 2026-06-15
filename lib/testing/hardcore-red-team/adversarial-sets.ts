import type {
  HardcoreRedTeamCase,
  HardcoreTestSet,
} from "@/lib/testing/hardcore-red-team/types";

const BUSY_DAY: HardcoreRedTeamCase["existingSchedule"] = [
  { time: "09:00", task: "팀 회의" },
  { time: "11:00", task: "프로젝트 마감" },
  { time: "14:00", task: "고객 미팅" },
  { time: "18:00", task: "헬스 운동" },
  { time: "20:00", task: "약속" },
];

function caseDef(
  id: string,
  testSet: HardcoreTestSet,
  input: string,
  extra: Partial<HardcoreRedTeamCase> = {}
): HardcoreRedTeamCase {
  return {
    id,
    testSet,
    input,
    mixedLayers: extra.mixedLayers ?? ["L0", "L1"],
    tags: extra.tags ?? [],
    ...extra,
  };
}

/** SET 1 — PURE BREAKDOWN */
const SET1: HardcoreRedTeamCase[] = [
  "뭐하지",
  "추천",
  "어떡해",
  "모르겠어",
  "그냥 답답함",
].map((input, i) =>
  caseDef(`HC-S1-${i + 1}`, "SET1_PURE_BREAKDOWN", input, {
    mixedLayers: ["L0", "L1"],
    tags: ["boundary", "collapse"],
    expectQuestion: true,
    expectedAbstraction: "L1",
    expectedRouting: "DECISION",
  })
);

/** SET 2 — CONTEXT COLLAPSE */
const SET2: HardcoreRedTeamCase[] = [
  {
    input: "그거 비슷하게 해줘",
    history: [{ role: "user", content: "근처 맛집 추천" }],
  },
  {
    input: "아까 거 기준으로 다시",
    history: [{ role: "assistant", content: "A) 가성비 B) 맛 C) 가볍게" }],
  },
  { input: "전에 했던 느낌으로" },
  { input: "대충 알아서" },
].map((item, i) =>
  caseDef(`HC-S2-${i + 1}`, "SET2_CONTEXT_COLLAPSE", item.input, {
    history: item.history,
    mixedLayers: ["L0", "L1"],
    tags: ["context_drift", "ambiguity"],
    expectQuestion: true,
    expectedRouting: "DECISION",
  })
);

/** SET 3 — MULTI CONFLICT CORE */
const SET3: HardcoreRedTeamCase[] = [
  "오늘 오전 회의 있는데 배고프고 돈 없고 운동도 해야됨",
  "내일 시험인데 친구 약속 잡혔고 컨디션 안 좋고 카페 가고 싶음",
  "월급 전인데 사고 싶은 거 있고 해야 할 일 밀려 있고 그냥 쉬고 싶음",
].map((input, i) =>
  caseDef(`HC-S3-${i + 1}`, "SET3_MULTI_CONFLICT", input, {
    mixedLayers: ["L0", "L2", "L3"],
    tags: ["multi_intent", "food", "schedule", "money", "emotion"],
    existingSchedule: BUSY_DAY,
    expectConflict: true,
  })
);

/** SET 4 — TIME + SCHEDULING STRESS */
const SET4: HardcoreRedTeamCase[] = [
  {
    input: "지금 해야 되는데 나중에 할 수도 있고 근데 안 하면 불안함",
    proposed: [{ time: "15:00", task: "미룬 작업" }],
  },
  {
    input: "오늘 일정 빡센데 갑자기 약속 생기고 운동도 끼어있음",
    proposed: [{ time: "18:30", task: "새 약속" }],
  },
  {
    input: "캘린더 이미 꽉 찼는데 새로운 할 일 추가됨",
    proposed: [{ time: "12:00", task: "긴급 작업" }],
  },
].map((item, i) =>
  caseDef(`HC-S4-${i + 1}`, "SET4_TIME_SCHEDULING", item.input, {
    mixedLayers: ["L1", "L3", "L4"],
    tags: ["scheduling", "time_warp", "energy"],
    existingSchedule: BUSY_DAY,
    proposedSchedule: item.proposed,
    expectConflict: true,
    expectedRouting: "CALENDAR",
  })
);

/** SET 5 — EMOTIONAL NOISE OVERLOAD */
const SET5: HardcoreRedTeamCase[] = [
  "그냥 다 모르겠고 귀찮고 근데 해야 할 것도 많고 머리아픔",
  "뭐 먹고 싶은지도 모르겠고 시간도 애매하고 돈도 애매함",
  "결정 자체가 싫은 상태",
].map((input, i) =>
  caseDef(`HC-S5-${i + 1}`, "SET5_EMOTIONAL_NOISE", input, {
    mixedLayers: ["L0", "L1", "L2"],
    tags: ["emotion", "noise", "decision_aversion"],
    expectQuestion: true,
    expectedAbstraction: "L0",
    expectedRouting: "DECISION",
  })
);

/** SET 6 — HIGH AMBIGUITY */
const SET6: HardcoreRedTeamCase[] = [
  "적당히 알아서",
  "괜찮은 걸로",
  "느낌대로",
  "전에처럼",
  "비슷하게 처리",
].map((input, i) =>
  caseDef(`HC-S6-${i + 1}`, "SET6_HIGH_AMBIGUITY", input, {
    mixedLayers: ["L0", "L1"],
    tags: ["ambiguity", "collapse"],
    expectQuestion: true,
    expectedRouting: "DECISION",
  })
);

/** SET 7 — SYSTEM SHOCK */
const SET7: HardcoreRedTeamCase[] = [
  "내 일정 다 무시하고 새로 짜줘",
  "기존 계획 다 갈아엎고 다시 최적화해",
  "오늘 하루 완전히 재설계",
  "모든 루틴 다시 만들어",
].map((input, i) =>
  caseDef(`HC-S7-${i + 1}`, "SET7_SYSTEM_SHOCK", input, {
    mixedLayers: ["L3", "L4"],
    tags: ["system_shock", "scheduling_override"],
    existingSchedule: BUSY_DAY,
    expectedAbstraction: "L4",
    expectedRouting: "CALENDAR",
    expectConflict: true,
  })
);

/** Mixed L0–L4 layer inputs (min 2 layers per sentence) */
const SET_MIXED: HardcoreRedTeamCase[] = [
  caseDef("HC-MX-1", "SET_MIXED_LAYER", "모르겠어 그냥 맛집 추천 좀", {
    mixedLayers: ["L0", "L1", "L2"],
    tags: ["mixed", "food", "collapse"],
  }),
  caseDef("HC-MX-2", "SET_MIXED_LAYER", "답답한데 일정 짜야 하고 운동 루틴 최적화", {
    mixedLayers: ["L0", "L3", "L4"],
    tags: ["mixed", "schedule", "exercise"],
    existingSchedule: BUSY_DAY,
  }),
  caseDef("HC-MX-3", "SET_MIXED_LAYER", "애매함 … 비슷하게 아까 거처럼 돈 아끼면서", {
    mixedLayers: ["L0", "L1", "L2"],
    tags: ["mixed", "context_drift", "money"],
    history: [{ role: "user", content: "이거 사도 돼?" }],
  }),
  caseDef("HC-MX-4", "SET_MIXED_LAYER", "피곤하고 배고프고 내일 시험인데 친구한테 답장도", {
    mixedLayers: ["L0", "L2", "L3"],
    tags: ["mixed", "emotion", "food", "work", "social"],
    existingSchedule: BUSY_DAY,
  }),
  caseDef("HC-MX-5", "SET_MIXED_LAYER", "그냥 … 수능 공부 전략이랑 카페 갈 시간도", {
    mixedLayers: ["L0", "L2", "L4"],
    tags: ["mixed", "work", "place"],
  }),
];

export const HARDCORE_RED_TEAM_SETS: Record<HardcoreTestSet, HardcoreRedTeamCase[]> = {
  SET1_PURE_BREAKDOWN: SET1,
  SET2_CONTEXT_COLLAPSE: SET2,
  SET3_MULTI_CONFLICT: SET3,
  SET4_TIME_SCHEDULING: SET4,
  SET5_EMOTIONAL_NOISE: SET5,
  SET6_HIGH_AMBIGUITY: SET6,
  SET7_SYSTEM_SHOCK: SET7,
  SET_MIXED_LAYER: SET_MIXED,
};

export const ALL_HARDCORE_CASES: HardcoreRedTeamCase[] = [
  ...SET1,
  ...SET2,
  ...SET3,
  ...SET4,
  ...SET5,
  ...SET6,
  ...SET7,
  ...SET_MIXED,
];

export const BUSY_SCHEDULE_FIXTURE = BUSY_DAY;
