import type { ActionRegistryEntry } from "@/lib/action-registry/types";

/** Tier 1 — high-stakes manual templates (100% priority when matched). */
export const MANUAL_CORE_TEMPLATES: ActionRegistryEntry[] = [
  {
    id: "AIRPORT_TRAVEL_01",
    contextKey: "airport|공항|항공|인천|김포|탑승|체크인",
    category: "Sentinel",
    scenario: "airport_travel",
    template_status: "PROMOTED",
    strategy_source: "MANUAL_CORE",
    usage_count: 999,
    main_action: {
      type: "SAVE",
      label: "일정 확정",
      prompt: "공항 일정 확정해줘",
      priority: 100,
    },
    shadow_actions: [
      { type: "CHECK", label: "항공권", prompt: "항공권 확인해줘", score: 85 },
      { type: "LIST", label: "짐 체크", prompt: "짐 체크리스트 만들어줘", score: 70 },
    ],
    createdAt: "1970-01-01T00:00:00.000Z",
    updatedAt: "1970-01-01T00:00:00.000Z",
    lastUsedAt: null,
  },
  {
    id: "MEETING_01",
    contextKey: "미팅|회의|meeting|zoom|화상|발표",
    category: "Apex",
    scenario: "meeting",
    template_status: "PROMOTED",
    strategy_source: "MANUAL_CORE",
    usage_count: 999,
    main_action: {
      type: "ZOOM",
      label: "미팅 준비",
      prompt: "미팅 링크와 준비사항 정리해줘",
      priority: 95,
    },
    shadow_actions: [
      { type: "ZOOM", label: "Zoom", prompt: "Zoom 링크 열어줘", score: 88 },
      { type: "LIST", label: "체크리스트", prompt: "미팅 체크리스트 만들어줘", score: 72 },
    ],
    createdAt: "1970-01-01T00:00:00.000Z",
    updatedAt: "1970-01-01T00:00:00.000Z",
    lastUsedAt: null,
  },
  {
    id: "MEDICAL_01",
    contextKey: "병원|치과|의료|진료|검진|clinic",
    category: "Haven",
    scenario: "medical",
    template_status: "PROMOTED",
    strategy_source: "MANUAL_CORE",
    usage_count: 999,
    main_action: {
      type: "SAVE",
      label: "진료 일정",
      prompt: "진료 일정 저장해줘",
      priority: 96,
    },
    shadow_actions: [
      { type: "CALL", label: "병원 전화", prompt: "병원 전화번호 찾아줘", score: 80 },
      { type: "NAVIGATE", label: "길찾기", prompt: "병원 길찾기", score: 75 },
    ],
    createdAt: "1970-01-01T00:00:00.000Z",
    updatedAt: "1970-01-01T00:00:00.000Z",
    lastUsedAt: null,
  },
  {
    id: "EMERGENCY_01",
    contextKey: "긴급|응급|119|112|사고|emergency|SOS",
    category: "Sentinel",
    scenario: "emergency",
    template_status: "PROMOTED",
    strategy_source: "MANUAL_CORE",
    usage_count: 999,
    main_action: {
      type: "CALL",
      label: "긴급 전화",
      prompt: "119 연결해줘",
      priority: 100,
    },
    shadow_actions: [
      { type: "NAVIGATE", label: "응급실", prompt: "가까운 응급실 찾아줘", score: 90 },
      { type: "SHARE", label: "위치 공유", prompt: "내 위치 공유해줘", score: 85 },
    ],
    createdAt: "1970-01-01T00:00:00.000Z",
    updatedAt: "1970-01-01T00:00:00.000Z",
    lastUsedAt: null,
  },
];

export function listManualCoreTemplates(): ActionRegistryEntry[] {
  return MANUAL_CORE_TEMPLATES;
}
