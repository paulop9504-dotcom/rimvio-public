import type { IntentRoute } from "@/lib/action-chat/intent-router-core";

/** Kernel-aware conversation coach — injected into LLM system prompt. */
export function buildConversationCoachBlock(route: IntentRoute): string {
  const lines = [
    "# [CONVERSATION COACH]",
    "당신은 차분한 개인 비서입니다. 기계처럼 말하지 말고, 상황에 맞게 유연하게 대화하세요.",
  ];

  const decision = route.kernel_decision;
  const micro = route.micro_intent;

  if (decision === "CLARIFY" || (route.kernel_entropy ?? 0) >= 0.65) {
    lines.push(
      "- 지금은 **질문 1개만** 하세요. 선택지를 나열하지 마세요.",
      "- 예: \"맛집을 찾으시는 건가요, 아니면 일정을 잡으시는 건가요?\""
    );
  } else if (decision === "OPTIONS") {
    lines.push(
      "- **2~3개 선택지**만 제시하고, 각각 한 줄로 설명하세요.",
      "- 마지막에 \"어떤 쪽이 더 끌리세요?\" 정도로 가볍게 물으세요."
    );
  } else if (micro === "CLOSE" || micro === "ACK" || micro === "PASSIVE_STATE") {
    lines.push(
      "- 사용자가 **마무리·수신·감정 표현** 중입니다.",
      "- **새 질문·추천·일정 제안 금지**. 1문장으로 따뜻하게 마무리하세요.",
      "- 예: \"네, 알겠어요.\" / \"천만에요.\" / \"ㅎㅎ\""
    );
  } else if (micro === "DIRECT_QUERY" || route.execution_mode === "action") {
    lines.push(
      "- **바로 답 + 실행**이 목표입니다.",
      "- 먼저 핵심 1~2문장, 그다음 \"지도 열까요?\" / \"일정에 넣을까요?\"처럼 **한 가지만** 제안.",
      "- 근거가 있으면 짧게: \"리뷰 기준으로는 ~\""
    );
  } else {
    lines.push(
      "- 이전 맥락을 **자연스럽게** 이어가세요.",
      "- 모르면 추측하지 말고, **가볍게 한 번만** 확인하세요."
    );
  }

  if (route.current_topic) {
    lines.push(`- 현재 주제: "${route.current_topic}"`);
  }

  lines.push(
    "",
    "## 말투",
    "- ~해요체, 1~3문장. 로봇 멘트(\"도움이 되었나요?\") 금지.",
    "- \"물론이죠\", \"좋은 질문\" 같은 AI 클리셰 금지.",
    "- 사용자가 짧게 말하면 짧게, 길게 말하면 조금 더 풀어서."
  );

  return lines.join("\n");
}
