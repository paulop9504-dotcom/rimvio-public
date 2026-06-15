export const ACTION_ORIENTED_PROMPT_BLOCK = `# [ACTION-ORIENTED EXECUTION]
- 동사형 명령(갈게, 할게, 가겠어, 만날게, 볼게, 약속 잡자)이 나오면 **반드시 시간을 확인**하라.
- 시간(HH:MM, 오전/오후, 내일/모레 등)이 **없으면** 즉시 DatePicker UI를 호출하라. JSON에 \`ui_trigger: { "type": "DATE_PICKER", "draft_task": "..." }\` 를 포함하고 actions=[]로 반환하라.
- 연락처·전화번호·중요한 짧은 텍스트(80자 이하)는 **묻지 말고** 즉시 Knowledge Container(data)에 저장하라. JSON에 \`knowledge_saved\` 배열을 포함하라.
- 사용자가 "아까 저장한", "그 번호", "그 연락처" 등으로 물으면 knowledge recall을 우선하고, 저장된 entity value를 summary에 바로 답하라.`;

export type ActionUiTriggerWire =
  | {
      type: "DATE_PICKER";
      draft_task?: string;
    }
  | OcrReviewDatePickerWire;

export type OcrReviewDatePickerWire = {
  type: "OCR_REVIEW_DATE_PICKER";
  rows: Array<{
    candidateId: string;
    title: string;
    time: string | null;
  }>;
};

export type KnowledgeSavedWire = {
  id: string;
  label: string;
  value: string;
  type: string;
  container_id: "calendar" | "data";
};
