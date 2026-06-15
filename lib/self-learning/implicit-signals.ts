import type { ChatTurn, ImplicitSignal } from "@/lib/self-learning/types";

const SHORT_NEGATIVE =
  /^(?:\?|아니(?:요|야|오)?|그게\s*아니|틀려|잘못|답답|됐(?:어|을)?|그만|안\s*돼)(?:[!?.~ㅋㅎ\s]*)?$/iu;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const tb = new Set(normalize(b).split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const token of ta) {
    if (tb.has(token)) {
      shared += 1;
    }
  }
  return shared / Math.max(ta.size, tb.size);
}

/** Implicit failure signals — no explicit 👍/👎 required. */
export function detectImplicitSignals(
  userMessage: string,
  history: readonly ChatTurn[] = []
): ImplicitSignal[] {
  const signals: ImplicitSignal[] = [];
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return signals;
  }

  const priorUserTurns = history
    .filter((turn) => turn.role === "user" && turn.content.trim())
    .map((turn) => turn.content.trim());

  if (priorUserTurns.length > 0) {
    const lastUser = priorUserTurns[priorUserTurns.length - 1]!;
    if (normalize(lastUser) === normalize(trimmed)) {
      signals.push({
        kind: "repeat_query",
        message: trimmed,
        detail: "same user utterance repeated",
      });
    } else if (tokenOverlap(lastUser, trimmed) >= 0.45 && trimmed.length >= 4) {
      signals.push({
        kind: "rephrase",
        message: trimmed,
        detail: `prior: ${lastUser.slice(0, 80)}`,
      });
    }
  }

  if (SHORT_NEGATIVE.test(trimmed)) {
    signals.push({
      kind: "short_negative",
      message: trimmed,
    });
  }

  const lastAssistant = [...history]
    .reverse()
    .find((turn) => turn.role === "assistant" && turn.content.trim());
  if (
    lastAssistant &&
    /(?:확인|맞습|등록할까|선택|A\)|B\)|C\))/u.test(lastAssistant.content) &&
    trimmed.length <= 3 &&
    !SHORT_NEGATIVE.test(trimmed)
  ) {
    signals.push({
      kind: "abandonment",
      message: trimmed,
      detail: "minimal reply after confirm prompt",
    });
  }

  return signals;
}

export function implicitSignalsImplyFailure(signals: readonly ImplicitSignal[]): boolean {
  return signals.some(
    (signal) =>
      signal.kind === "repeat_query" ||
      signal.kind === "short_negative" ||
      signal.kind === "rephrase" ||
      signal.kind === "abandonment"
  );
}
