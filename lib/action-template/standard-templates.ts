import type { ActionTemplateSchema } from "@/lib/action-template/types";

/** Standard Action OS templates — Base layer (system-provided). */
export const STANDARD_TEMPLATES: ActionTemplateSchema[] = [
  {
    template_id: "trip_basic_001",
    category: "Haven",
    name: "여행 짐 싸기 (기본)",
    context_trigger: "여행 계획이 감지될 때",
    context_key: "여행|trip|출국|휴가|vacation|3박|4일|일본|도쿄|tokyo|제주",
    base_actions: [
      {
        type: "CHECKLIST",
        label: "짐 체크리스트",
        id: "packing_list",
        prompt: "rimvio://trip/packing",
      },
      {
        type: "LINK",
        label: "날씨 확인",
        id: "weather",
        url: "https://weather.com",
      },
    ],
    base_items: [
      { item: "여권", mandatory: true },
      { item: "충전기", mandatory: true },
      { item: "옷", mandatory: false },
      { item: "세면도구", mandatory: false },
    ],
    ai_modification_policy: {
      allow_addition: true,
      mandatory_lock: true,
      context_prompt:
        "여행지 날씨와 일정에 맞춰 base_items에 추가 아이템을 제안하라.",
    },
  },
  {
    template_id: "work_basic_001",
    category: "Apex",
    name: "출장 (업무)",
    context_trigger: "출장·비즈니스 이동이 감지될 때",
    context_key: "출장|business\\s*trip|biz\\s*trip|워크|업무\\s*여행",
    base_actions: [
      {
        type: "SAVE",
        label: "경비 기록",
        id: "expense",
        prompt: "출장 경비 기록해줘",
      },
      {
        type: "ZOOM",
        label: "화상 회의 링크",
        id: "zoom_link",
        prompt: "화상 회의 링크 열어줘",
      },
    ],
    base_items: [
      { item: "명함", mandatory: true },
      { item: "노트북", mandatory: true },
      { item: "충전기", mandatory: true },
    ],
    ai_modification_policy: {
      allow_addition: true,
      mandatory_lock: true,
      context_prompt: "출장 일정과 회의 유형에 맞춰 업무용 아이템을 추가하라.",
    },
    inherits_from: ["trip_basic_001"],
  },
  {
    template_id: "work_meeting_01",
    category: "Apex",
    name: "업무 미팅",
    context_trigger: "회의·미팅이 감지될 때",
    context_key: "미팅|회의|meeting|zoom|화상|발표|보안\\s*회의",
    base_actions: [
      { type: "SAVE", label: "회의실 예약", id: "room_book", prompt: "회의실 예약해줘" },
      {
        type: "INFO",
        label: "지난 미팅록 열기",
        id: "last_notes",
        prompt: "지난 미팅록 보여줘",
      },
      {
        type: "ZOOM",
        label: "참석자 메일 작성",
        id: "attendee_mail",
        prompt: "참석자에게 회의 메일 작성해줘",
      },
    ],
    base_items: [
      { item: "노트북", mandatory: true },
      { item: "자료 USB", mandatory: false },
    ],
    ai_modification_policy: {
      allow_addition: true,
      mandatory_lock: false,
      context_prompt:
        "회의 성격(보안·발표·1:1)에 맞춰 base_actions와 base_items를 확장하라.",
    },
  },
  {
    template_id: "medical_visit_01",
    category: "Haven",
    name: "병원 방문",
    context_trigger: "진료·검진이 감지될 때",
    context_key: "병원|치과|의료|진료|검진|clinic|처방",
    base_actions: [
      {
        type: "SAVE",
        label: "진료 기록 카드",
        id: "medical_card",
        prompt: "진료 기록 저장해줘",
      },
      {
        type: "SAVE",
        label: "처방전 저장",
        id: "prescription",
        prompt: "처방전 저장해줘",
      },
      {
        type: "INFO",
        label: "보험금 청구",
        id: "insurance",
        prompt: "보험금 청구 방법 알려줘",
      },
    ],
    base_items: [
      { item: "신분증", mandatory: true },
      { item: "보험증", mandatory: true },
    ],
    ai_modification_policy: {
      allow_addition: true,
      mandatory_lock: true,
      context_prompt:
        "병원 특성(모바일 처방전 지원 등)에 맞춰 액션과 아이템을 추가하라.",
    },
  },
];

export function getStandardTemplate(templateId: string): ActionTemplateSchema | null {
  return STANDARD_TEMPLATES.find((item) => item.template_id === templateId) ?? null;
}

export function listStandardTemplates(): ActionTemplateSchema[] {
  return [...STANDARD_TEMPLATES];
}
