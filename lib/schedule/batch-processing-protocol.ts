export const BATCH_PROCESSING_RULE = `# [Batch Processing Rule]

사용자가 **다수 항목 리스트**(줄바꿈 일정, JSON 배열, batch_pending)를 입력한 경우:

1. **절대 첫 번째 항목만 처리하고 멈추지 마라.**
2. 리스트의 **마지막 항목까지** 모든 일정/툴 호출을 순차 처리하라.
3. GLOBAL_BRAIN_SNAPSHOT.schedule_list_batch가 있으면 LLM 계산/추측 없이 그 배열을 사용하라.
4. 완료 후 "총 N개의 일정이 모두 등록되었습니다" 형태로 최종 보고하라.

## JSON 배열 (권장)
\`\`\`json
[{"time":"09:00","task":"핵심 업무","category":"Apex"}]
\`\`\``;
