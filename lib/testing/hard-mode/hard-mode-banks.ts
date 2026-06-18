import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type { HardModeBucket } from "@/lib/testing/hard-mode/hard-mode-routing";

export type HardModeCriterion =
  | "intent_consistency"
  | "boundary_stability"
  | "multi_intent_hierarchy"
  | "noise_resistance"
  | "context_continuity"
  | "determinism";

export type HardModeCase = {
  id: string;
  criterion: HardModeCriterion;
  label: string;
  inputs: readonly string[];
  /** Synonym groups must collapse to same bucket. */
  expectSameBucket?: boolean;
  /** When set, every run must match one of these buckets. */
  expectedBuckets?: readonly HardModeBucket[];
  forbiddenBuckets?: readonly string[];
  forbiddenSurfaces?: readonly string[];
  expectPrimary?: string;
  history?: readonly OrchestrateHistoryTurn[];
  determinismRuns?: number;
};

export const HARD_MODE_CASES: HardModeCase[] = [
  {
    id: "C1-food-synonyms",
    criterion: "intent_consistency",
    label: "FOOD synonyms → same bucket",
    inputs: ["오늘 뭐 먹지?", "오늘 점심 뭐 먹어?", "배고픈데 뭐 추천해?"],
    expectSameBucket: true,
    forbiddenSurfaces: ["INFO"],
  },
  {
    id: "C1-decision-synonyms",
    criterion: "intent_consistency",
    label: "DECISION synonyms → same bucket",
    inputs: ["이거 사도 돼?", "이거 괜찮아?", "지금 이거 해도 돼?"],
    expectSameBucket: true,
    expectedBuckets: ["DECISION"],
    forbiddenSurfaces: ["INFO"],
  },
  {
    id: "C2-boundary-minimal",
    criterion: "boundary_stability",
    label: "Minimal ambiguous — no INFO escape",
    inputs: ["뭐하지", "추천", "어떡해"],
    forbiddenSurfaces: ["INFO"],
    forbiddenBuckets: ["INFO"],
  },
  {
    id: "C2-boundary-bare",
    criterion: "boundary_stability",
    label: "Bare decision cue",
    inputs: ["괜찮아?", "vs", "고르기 힘들어"],
    forbiddenSurfaces: ["INFO"],
  },
  {
    id: "C3-multi-meal-schedule",
    criterion: "multi_intent_hierarchy",
    label: "FOOD primary over SCHEDULE",
    inputs: ["오늘 뭐 먹지 + 일정도 짜줘", "맛집 + 내일 일정"],
    expectPrimary: "food",
    forbiddenSurfaces: ["INFO"],
  },
  {
    id: "C3-multi-travel-plan",
    criterion: "multi_intent_hierarchy",
    label: "TRAVEL/SCHEDULE primary split",
    inputs: ["여행지 추천 + 계획도 알려줘"],
    expectPrimary: "travel",
    forbiddenSurfaces: ["INFO"],
  },
  {
    id: "C4-noise-composite",
    criterion: "noise_resistance",
    label: "Noise — FOOD vs SCHEDULE separation",
    inputs: [
      "나 지금 너무 피곤한데 배고프고 일정도 있고 뭐 먹을지 모르겠어",
    ],
    expectPrimary: "food",
    forbiddenSurfaces: ["INFO"],
  },
  {
    id: "C4-noise-food",
    criterion: "noise_resistance",
    label: "Noise around food intent",
    inputs: ["아 진짜 배고픈데 뭐 먹지 그냥 빨리"],
    expectSameBucket: true,
    forbiddenSurfaces: ["INFO"],
  },
  {
    id: "C5-context-that",
    criterion: "context_continuity",
    label: "Deictic reference — 그거",
    inputs: ["그거 추천해줘"],
    history: [
      { role: "user", content: "강남역 맛집 알려줘" },
      { role: "assistant", content: "강남역 맛집 후보를 찾았어요." },
    ],
    forbiddenSurfaces: ["INFO"],
    expectPrimary: "food",
  },
  {
    id: "C5-context-similar",
    criterion: "context_continuity",
    label: "Similar follow-up",
    inputs: ["비슷하게 다른 거"],
    history: [
      { role: "user", content: "원룸 추천해줘" },
      { role: "assistant", content: "원룸 선택지를 정리해 드릴게요." },
    ],
    forbiddenSurfaces: ["INFO"],
    expectPrimary: "housing",
  },
  {
    id: "C6-determinism-food",
    criterion: "determinism",
    label: "Same input → same output (food)",
    inputs: ["근처 맛집 추천"],
    determinismRuns: 3,
    forbiddenSurfaces: ["INFO"],
  },
  {
    id: "C6-determinism-decision",
    criterion: "determinism",
    label: "Same input → same output (decision)",
    inputs: ["A vs B 뭐가 좋아?"],
    determinismRuns: 3,
    forbiddenSurfaces: ["INFO"],
  },
];

export const HARD_MODE_MUTATION_ROUNDS = 10;
