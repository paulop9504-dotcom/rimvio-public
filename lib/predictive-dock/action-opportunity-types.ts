import type { PredictiveActionType } from "@/lib/predictive-dock/types";

/** Rimvio Action Opportunity lifecycle — not raw buttons. */
export type ActionOpportunityState = "ACTIVE" | "WARM" | "HIDDEN" | "EXPIRED";

/** Conversation intent domain — drives Rule 1 (relevance). */
export type ConversationIntentDomain =
  | "dining_discovery"
  | "travel"
  | "schedule"
  | "place_execution"
  | "general";

export const MAX_ACTION_OPPORTUNITIES = 3;

export const OPPORTUNITY_SCORE_WEIGHTS = {
  intentMatch: 0.4,
  temporalMatch: 0.3,
  containerMatch: 0.2,
  behaviorMatch: 0.1,
} as const;

/** Minimum composite score to surface above composer (else HIDDEN). */
export const OPPORTUNITY_VISIBLE_MIN_SCORE = 0.42;

/** Types allowed per intent domain — unrelated → HIDDEN. */
export const OPPORTUNITY_TYPES_BY_INTENT: Record<
  ConversationIntentDomain,
  readonly PredictiveActionType[]
> = {
  dining_discovery: ["NAVIGATE", "SAVE", "CALL", "SHARE", "INFO"],
  travel: ["TAXI", "CHECK", "LIST", "TICKET_QR", "NAVIGATE", "TRANSIT", "INFO"],
  schedule: ["NAVIGATE", "CALL", "TRANSIT", "ZOOM", "INFO", "NEXT"],
  place_execution: ["NAVIGATE", "CALL", "SAVE", "SHARE"],
  general: ["NAVIGATE", "CALL", "INFO"],
};

export type ActionOpportunityScoreBreakdown = {
  intentMatch: number;
  temporalMatch: number;
  containerMatch: number;
  behaviorMatch: number;
  composite: number;
};

export const ACTION_OPPORTUNITY_PROTOCOL = `# Rimvio Action Opportunity (보조버튼)

보조버튼 = Main Action이 아닌 **Action Opportunity**.
"지금은 안 눌러도 되지만 곧 필요할 가능성이 높은 행동".

- 최대 ${MAX_ACTION_OPPORTUNITIES}개 · 현재 문맥 관련 · 시간축 기반 · 자동 등장/퇴장
- Rule 1: 현재 대화 intent와 무관하면 HIDDEN (맛집 중 ✈️ 공항 이동 금지)
- Rule 2: 컨테이너/여행 컨텍스트는 **활성 대화**일 때만 (localStorage 여행만으로는 숨김)
- Intent 전환 시 기존 Dock 폐기 → 새 Opportunity 생성
- 사용 완료 / 시간 만료 → EXPIRED → UI 제거`;
