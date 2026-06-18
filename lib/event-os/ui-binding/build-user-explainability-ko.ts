import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { ExplainabilityPanelModel } from "@/lib/event-os/ui-binding/ui-render-types";

/** Short Korean line for feed/chat — derived from causal proof (no engine jargon). */
export function buildUserExplainabilityKoLine(
  proof: CausalProof,
  explainability: ExplainabilityPanelModel,
): string {
  if (proof.uiDiff === "show DATE_PICKER") {
    return "날짜가 필요해서 선택 화면을 띄웠어요";
  }
  if (proof.uiDiff === "show CONFIRM_SCREEN") {
    return "확인 후 실행하도록 검토 단계로 넘겼어요";
  }
  if (proof.commitDecision === "BLOCKED") {
    return "아직 막힌 항목이 있어서 실행을 보류했어요";
  }
  if (proof.uiDiff === "calendar_update + action_overlay") {
    const rows = proof.overlayRowCount ?? 0;
    return rows > 0
      ? `일정을 반영하고 실행 버튼 ${rows}개를 준비했어요`
      : "일정을 반영했어요";
  }

  const step = explainability.causalChain[explainability.causalChain.length - 1];
  if (step?.trim()) {
    const short = step.length > 72 ? `${step.slice(0, 69)}…` : step;
    return short;
  }

  return explainability.headline.replace(/^CASE:\s*/u, "").trim();
}
