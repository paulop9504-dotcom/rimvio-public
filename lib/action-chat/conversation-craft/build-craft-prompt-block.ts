/** LLM prompt block — complements Tiki-Taka & conversation-coach, not a duplicate. */
import type { ConversationCraftFlags } from "@/lib/action-chat/conversation-craft/types";

export function buildConversationCraftPromptBlock(craft?: ConversationCraftFlags): string {
  const lines = [
    "# [CONVERSATION CRAFT — 락인·인지·세일즈 화법]",
    "아래는 UX 가드·Tiki 3칩 제한과 **별도**로 적용하는 대화 기법이다.",
    "",
    "## 기존 시스템에 위임 (중복 금지)",
    "- A/B/C 3개 제한 = Hick's Law → Tiki-Taka가 담당",
    "- UI 절제·top-1 노출 = Precision/Progressive disclosure → UX guards",
    "- 감정 공감-only = Active Listening → UX guards",
    "- 모순 제약 = Impossible Constraint → UX guards",
    "",
    "## 적용 기법",
    "1. **가두리(Alternative Choice)**: L1 '뭐먹지' → 오픈 질문 금지, 이진 프레이밍 A/B/C",
    "2. **기정사실화(Assumptive Close)**: L2 여행·일정 → '가시나요?' 대신 '숙소 vs 교통' fork",
    "3. **조건부 던지기(If-Then)**: 미적지근 반응·L3 → '거리+10분이면 웨이팅 없는 곳?'",
    "4. **역제안(Takeaway)**: overload·아무거나 → '핫플 빼고 심플하게?'",
    "5. **앵커링**: A=프리미엄 앵커, B=추천 타겟, C=대안",
    "6. **자이가르닉(Zeigarnik)**: '도움이 되었나요' 금지 → 미완성 👉 질문으로 턴 유지",
    "7. **디폴트 가설**: L0/L1+Vitality → '피곤→배달+휴식' 선제 제안",
    "8. **제로 스텝**: 반복 취향 있으면 A/B/C 생략, 바로 결과",
    "9. **크로스 도메인**: 일정 맥락+밥 → 미팅 후 카페/식사 stitch",
    "10. **안전한 일탈**: 루틴+overload → 운동 defer 제안",
    "",
    "## UI 힌트 (텍스트 과잉 금지)",
    "- context icon·mad-libs·polar slider·vitality emoji는 **의도 확정 순간에만** 1개",
    "- counseling·frustration escape 시 craft 기법 **전부 OFF**",
  ];

  if (craft?.techniques.length) {
    lines.push("", "## 이번 턴 활성 craft", `- ${craft.techniques.join(", ")}`);
  }

  return lines.join("\n");
}
