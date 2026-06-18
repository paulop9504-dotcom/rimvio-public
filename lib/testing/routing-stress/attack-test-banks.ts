import type { RoutingSurface } from "@/lib/action-chat/classify-semantic-routing-surface";

export type AttackGroupId =
  | "food_disguised_info"
  | "info_trap_decision"
  | "step_disguised_info"
  | "info_keyword_trap"
  | "decision_disguised_info"
  | "location_confusion"
  | "multi_intent_trap"
  | "emotion_disguised_info"
  | "tech_trap"
  | "ambiguous_minimal";

export type AttackTestCase = {
  groupId: AttackGroupId;
  groupLabel: string;
  input: string;
  expected: readonly RoutingSurface[];
  forbidInfo: boolean;
};

export const ROUTING_STRESS_ATTACKS: AttackTestCase[] = [
  {
    groupId: "food_disguised_info",
    groupLabel: "FOOD disguised as INFO",
    input: "이거 뭐야? 근처 맛집 추천해줘",
    expected: ["FORK"],
    forbidInfo: true,
  },
  {
    groupId: "food_disguised_info",
    groupLabel: "FOOD disguised as INFO",
    input: "이 음식 뭐야? 먹을만한 집 알려줘",
    expected: ["FORK"],
    forbidInfo: true,
  },
  {
    groupId: "food_disguised_info",
    groupLabel: "FOOD disguised as INFO",
    input: "이거 설명해줘 (배달 음식 상황)",
    expected: ["FORK", "STEP"],
    forbidInfo: true,
  },
  {
    groupId: "info_trap_decision",
    groupLabel: "INFO trap → DECISION",
    input: "원룸 추천해줘",
    expected: ["DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "info_trap_decision",
    groupLabel: "INFO trap → DECISION",
    input: "어디 살아야 돼?",
    expected: ["DECISION", "STEP"],
    forbidInfo: true,
  },
  {
    groupId: "info_trap_decision",
    groupLabel: "INFO trap → DECISION",
    input: "이 지역 괜찮아?",
    expected: ["DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "step_disguised_info",
    groupLabel: "STEP disguised as INFO",
    input: "내일 일정 뭐야?",
    expected: ["STEP"],
    forbidInfo: true,
  },
  {
    groupId: "step_disguised_info",
    groupLabel: "STEP disguised as INFO",
    input: "여행 어떻게 해?",
    expected: ["STEP"],
    forbidInfo: true,
  },
  {
    groupId: "step_disguised_info",
    groupLabel: "STEP disguised as INFO",
    input: "계획 알려줘",
    expected: ["STEP"],
    forbidInfo: true,
  },
  {
    groupId: "info_keyword_trap",
    groupLabel: "INFO keyword trap",
    input: "이거 뭐야? (맛집 상황)",
    expected: ["FORK", "DECISION", "STEP"],
    forbidInfo: true,
  },
  {
    groupId: "info_keyword_trap",
    groupLabel: "INFO keyword trap",
    input: "쉽게 설명해줘 (일정 정리 필요)",
    expected: ["STEP", "DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "info_keyword_trap",
    groupLabel: "INFO keyword trap",
    input: "차이 뭐야? (A vs B 선택)",
    expected: ["DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "decision_disguised_info",
    groupLabel: "DECISION disguised as INFO",
    input: "이거 사도 돼?",
    expected: ["DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "decision_disguised_info",
    groupLabel: "DECISION disguised as INFO",
    input: "A vs B 뭐가 좋아?",
    expected: ["DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "decision_disguised_info",
    groupLabel: "DECISION disguised as INFO",
    input: "지금 이거 괜찮아?",
    expected: ["DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "location_confusion",
    groupLabel: "LOCATION confusion",
    input: "여기 살아도 돼?",
    expected: ["DECISION", "STEP"],
    forbidInfo: true,
  },
  {
    groupId: "location_confusion",
    groupLabel: "LOCATION confusion",
    input: "부산 어디가 좋아?",
    expected: ["DECISION", "STEP"],
    forbidInfo: true,
  },
  {
    groupId: "location_confusion",
    groupLabel: "LOCATION confusion",
    input: "서울 vs 부산 어디?",
    expected: ["DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "multi_intent_trap",
    groupLabel: "MULTI-INTENT trap",
    input: "오늘 뭐 먹지 + 일정도 짜줘",
    expected: ["FORK"],
    forbidInfo: true,
  },
  {
    groupId: "multi_intent_trap",
    groupLabel: "MULTI-INTENT trap",
    input: "여행지 추천 + 계획도 알려줘",
    expected: ["FORK", "STEP", "DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "multi_intent_trap",
    groupLabel: "MULTI-INTENT trap",
    input: "맛집 + 데이트 코스",
    expected: ["FORK"],
    forbidInfo: true,
  },
  {
    groupId: "emotion_disguised_info",
    groupLabel: "EMOTION disguised as INFO",
    input: "나 이거 잘하고 있는 거야?",
    expected: ["REFLECT"],
    forbidInfo: true,
  },
  {
    groupId: "emotion_disguised_info",
    groupLabel: "EMOTION disguised as INFO",
    input: "이 선택 맞아?",
    expected: ["REFLECT", "DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "emotion_disguised_info",
    groupLabel: "EMOTION disguised as INFO",
    input: "너무 힘든데 이거 뭐야?",
    expected: ["REFLECT"],
    forbidInfo: true,
  },
  {
    groupId: "tech_trap",
    groupLabel: "TECH trap",
    input: "AI 뭐야?",
    expected: ["INFO", "STEP"],
    forbidInfo: false,
  },
  {
    groupId: "tech_trap",
    groupLabel: "TECH trap",
    input: "이거 어떻게 써?",
    expected: ["INFO", "STEP"],
    forbidInfo: false,
  },
  {
    groupId: "tech_trap",
    groupLabel: "TECH trap",
    input: "GPT 차이 뭐야?",
    expected: ["INFO", "STEP"],
    forbidInfo: false,
  },
  {
    groupId: "ambiguous_minimal",
    groupLabel: "AMBIGUOUS minimal input",
    input: "뭐 먹지?",
    expected: ["FORK", "REFLECT"],
    forbidInfo: true,
  },
  {
    groupId: "ambiguous_minimal",
    groupLabel: "AMBIGUOUS minimal input",
    input: "어디 가지?",
    expected: ["FORK", "REFLECT", "DECISION"],
    forbidInfo: true,
  },
  {
    groupId: "ambiguous_minimal",
    groupLabel: "AMBIGUOUS minimal input",
    input: "어떡하지?",
    expected: ["FORK", "REFLECT", "DECISION"],
    forbidInfo: true,
  },
];
