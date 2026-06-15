import type {
  ChatTurn,
  FailureKind,
  ImplicitSignal,
  InteractionRecord,
} from "@/lib/self-learning/types";
import { implicitSignalsImplyFailure } from "@/lib/self-learning/implicit-signals";

const FRUSTRATION_ESCAPE =
  /맥락을\s*잘못\s*짚|처음부터\s*편하게|선택지\s*없이/u;
const GENERIC_INFO = /무엇을\s*도와드릴까요|잠시\s*문제|처리할\s*수\s*없/u;
const UX_MISMATCH =
  /(?:A\)|B\)|C\)|👉).*(?:확인|등록|넣)/u;

function intentKeyFromRouting(routing?: InteractionRecord["routing"]): string {
  return (
    routing?.routing_patch ??
    routing?.ai_intent ??
    routing?.chat_axis_route ??
    routing?.semantic_reason ??
    "unknown"
  );
}

const AFFIRMATIVE_AFTER_CONFIRM =
  /^(?:네|응|예|좋아|그래|맞(?:아|아요|습니다)?)\s*(?:해(?:줘|주세요)?|할게|요|넣(?:어(?:줘|주세요)?)?|등록(?:해(?:줘|주세요)?)?)?$/iu;

function lastAssistantAskedConfirm(history: readonly ChatTurn[]): boolean {
  const last = [...history]
    .reverse()
    .find((turn) => turn.role === "assistant" && turn.content.trim());
  if (!last) {
    return false;
  }
  return /(?:확인|맞습|등록할까|넣지\s*않|후보|캘린더)/u.test(last.content);
}

export function classifyFailure(input: {
  userMessage: string;
  assistantSummary: string;
  routing?: InteractionRecord["routing"];
  explicitVerdict?: "up" | "down";
  implicitSignals: ImplicitSignal[];
  history?: readonly ChatTurn[];
}): { failureKind: FailureKind; isFailure: boolean; intentKey: string } {
  const intentKey = intentKeyFromRouting(input.routing);
  const summary = input.assistantSummary.trim();

  if (input.explicitVerdict === "down") {
    return { failureKind: "ux_mismatch", isFailure: true, intentKey };
  }
  if (input.explicitVerdict === "up") {
    return { failureKind: "unknown", isFailure: false, intentKey };
  }

  const history = input.history ?? [];
  if (
    lastAssistantAskedConfirm(history) &&
    AFFIRMATIVE_AFTER_CONFIRM.test(input.userMessage.trim()) &&
    (FRUSTRATION_ESCAPE.test(summary) || GENERIC_INFO.test(summary))
  ) {
    return { failureKind: "execution_error", isFailure: true, intentKey };
  }

  const implicitFail = implicitSignalsImplyFailure(input.implicitSignals);
  if (!implicitFail) {
    return { failureKind: "unknown", isFailure: false, intentKey };
  }

  if (GENERIC_INFO.test(summary) || FRUSTRATION_ESCAPE.test(summary)) {
    return { failureKind: "routing_error", isFailure: true, intentKey };
  }

  if (UX_MISMATCH.test(summary)) {
    return { failureKind: "ux_mismatch", isFailure: true, intentKey };
  }

  if (
    input.implicitSignals.some((s) => s.kind === "repeat_query") &&
    /(?:등록|캘린더|일정|확인)/u.test(summary)
  ) {
    return { failureKind: "execution_error", isFailure: true, intentKey };
  }

  if (input.implicitSignals.some((s) => s.kind === "short_negative")) {
    return { failureKind: "ux_mismatch", isFailure: true, intentKey };
  }

  return { failureKind: "routing_error", isFailure: true, intentKey };
}
