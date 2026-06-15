export const CONFIRMATION_LOGIC_PROMPT = `# [CONFIRMATION LOGIC]

- 입력된 정보가 모호하거나, 시스템이 추측한 위치가 100% 확신이 서지 않을 경우:

  - meta.intent를 "CONFIRM"으로 설정하십시오.

  - persona_message: **공감형 한 줄** (72자 이내, 예: "둔산동 갤러리아 말씀이시죠? 좋습니다. 바로 챙겨드릴게요.")

  - confirm_message: **데이터 카드용 짧은 질문** (예: "아래 정보로 진행할까요?")

  - confirm_data: { subject, category: "PLACE"|"TIME"|"CONTACT"|"OTHER" }

  - extracted_data에는 AI가 추측한 정제된 정보를 담으십시오.

  - actions=[] (확인 전까지 액션을 비워두십시오).

  - thought: **Found/Intent/Missing** 형식. (Found: 확인한 사실, Intent: 하려는 일, Missing: 불확실한 것)

- **UI 출력 규칙 (Reporting → Triggering)**:
  - Missing이 있으면 **절대 완료 보고(summary: "확인 완료" 등) 금지**.
  - 반드시 meta: { intent: "CONFIRM" } + persona_message + confirm_message + extracted_data (+ witty_buttons 선택) 출력.
  - actions=[] — CONFIRM UI가 뜰 때까지 액션을 비우라.

- **witty_buttons** (선택, 장난·감성 맥락): "네/아니오" 대신 대화 맥락에 맞는 창의적 label/action 쌍.
  - 예: { "label": "나이 대신 지식 먹이기", "action": "feed_knowledge" }
  - action 예: feed_knowledge, compliment, play_along, accept_confirm, reject_place

- 확신이 있는 경우:

  - meta.intent를 "EXECUTE"로 설정하십시오.



# [BATCH vs CONFIRM PRIORITY]

- Batch(여러 작업) + Confirm(모호한 장소)이 섞이면 **Confirm이 Priority 0 (루트)**.

- 확정된 나머지 작업은 batch_pending에 넣고, 장소 확인 후 처리.

- actions 배열을 쪼개 보여주지 말고 CONFIRM JSON이 전체 턴의 루트.



- JSON 예시 (CONFIRM + batch_pending):

{

  "thought": "Found: 둔산동·갤러리아·오후 5시·010 번호. Intent: 장소 확인 후 일정·연락처 등록. Missing: 갤러리아 정확한 지점.",

  "summary": "장소 확인",

  "meta": { "intent": "CONFIRM" },

  "persona_message": "대전 둔산동 갤러리아 말씀이시죠? 좋습니다. 바로 챙겨드릴게요.",

  "confirm_message": "아래 정보로 진행할까요?",

  "confirm_data": { "subject": "대전 둔산동 갤러리아", "category": "PLACE" },

  "extracted_data": {

    "address": "대전 서구 둔산동 1016",

    "phone": null,

    "datetime": "2026-05-30T17:03:00",

    "place_name": "갤러리아",

    "url": null

  },

  "batch_pending": [

    { "type": "PHONE", "summary": "010-1234-5678 저장", "extracted_data": { "phone": "01012345678" } }

  ],

  "actions": []

}`;

