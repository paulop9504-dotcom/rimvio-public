import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import {
  KERNEL_MICRO_INTENT_KEYS,
  type KernelMicroIntentKey,
  type MicroIntentDistribution,
} from "@/lib/event-kernel/types";

const SHORT_UTTERANCE_MAX = 32;

const GRATITUDE =
  /(?:고마워|고맙(?:습니다|어요)?|감사(?:합니다|해요)?|thank\s*(?:you|s|u)|thx|ㄱㅅ)/iu;
const CLOSURE =
  /^(?:됐(?:어|어요|습니다)?|잘\s*가|바이|bye|goodbye|ㅂㅂ|ㅃㅃ|또\s*봐|see\s*ya)(?:[!?.~ㅋㅎ\s]*)?$/iu;
const ACK_STOP =
  /^(?:알겠(?:어|어요|습니다)?|이해(?:했(?:어|어요|습니다)?)?|오케이\s*이해(?:했(?:어|어요)?)?|알았(?:어|어요|습니다)?)(?:[!?.~ㅋㅎ\s]*)?$/iu;
const CONTINUATION_OVERRIDE =
  /(?:근데|그런데|하지만|그리고\s*하나|하나\s*만\s*더|더\s*물|추가로|이어서\s*물)/iu;
const NEXT_QUESTION_MARKER =
  /(?:그럼|그래서|그\s*다음|다음은|다음\s*도|이어서|더\s*알|설명(?:해|좀)|왜\s*그|어때\s*진짜|다시\s*말|그\s*다음은)/iu;
const DEICTIC_RECALL =
  /^(?:그거|그게|저거|이거)\s*뭐(?:였|더|야)?(?:지|어|나|까|더라)?(?:\?|[!.~ㅋㅎ\s]*)?$/iu;
const QUERY_MARKER =
  /(?:가격|얼마|언제|어디|몇\s*시|영업|전화|주차|메뉴|예약|뭐야|뭔데|이거|그거|저거)/iu;
const DEICTIC = /(?:이거|그거|저거|여기|거기)/iu;
const SHIFT_CUE =
  /(?:다른\s*(?:곳|장소|맛집)|새로\s*(?:찾|잡|등록)|말\s*바꿔|주제\s*바꿔|그건\s*그렇고)/i;
const PASSIVE_ONLY =
  /^(?:[ㅋㅎ]+|[ㅇ]{1,3}|ㅇㅇ|ㅋ|ㅎ|ㅋㅋ|ㅎㅎ|ㅋㅋㅋ|ㅎㅎㅎ)(?:[!?.~\s]*)?$/iu;
const PASSIVE_WITH_ACK =
  /^(?:응|네|예|그래|ㅇㅇ|ok|okay)\s*[ㅋㅎ~!.\s]+$/iu;
const ACK_RECEIPT =
  /^(?:응|네|예|그래|좋아|오케이|ok|okay|ㅇㅇ|ㅇ(?:\.|$)|맞(?:아|아요)?)(?:[!?.~ㅋㅎ\s]*)?$/iu;
const ACTION_VERB =
  /(?:일정|예약|길찾|네비|지도|맛집|쇼핑|검색|찾아|알려|열어|추천|가야|갈\s*거|경기장|월드컵)/i;
const NEW_TASK_CUE =
  /(?:일정\s*(?:잡|등록|추가)|경기장|월드컵|새로\s*(?:찾|잡|등록))/i;

function priorTurns(
  history: OrchestrateHistoryTurn[] | undefined,
  currentMessage: string
): OrchestrateHistoryTurn[] {
  const turns = history ?? [];
  if (turns.length === 0) {
    return [];
  }
  const last = turns[turns.length - 1];
  if (last?.role === "user" && last.content.trim() === currentMessage.trim()) {
    return turns.slice(0, -1);
  }
  return turns;
}

function baselineScores(): Record<KernelMicroIntentKey, number> {
  return {
    CONTINUE: 0.08,
    QUERY: 0.08,
    SHIFT: 0.05,
    ACK: 0.08,
    CLOSE: 0.05,
    PASSIVE: 0.05,
  };
}

/** Raw scores → softmax → distribution summing to 1.0 */
export function classifyMicroIntentDistribution(input: {
  message: string;
  history?: OrchestrateHistoryTurn[];
}): { distribution: MicroIntentDistribution; signals: string[] } {
  const message = input.message.trim();
  const signals: string[] = [];
  const scores = baselineScores();
  const prior = priorTurns(input.history, message);
  const hasContext = prior.length > 0;

  if (!message) {
    scores.ACK += 0.4;
    signals.push("empty");
    return { distribution: softmaxScores(scores), signals };
  }

  if (SHIFT_CUE.test(message)) {
    scores.SHIFT += 2.4;
    signals.push("shift_cue");
  }

  if (GRATITUDE.test(message)) {
    if (CONTINUATION_OVERRIDE.test(message)) {
      scores.CONTINUE += 3.2;
      signals.push("gratitude_continue");
    } else {
      scores.CLOSE += 4.5;
      signals.push("gratitude_close");
    }
  }

  if (CLOSURE.test(message) || ACK_STOP.test(message)) {
    scores.CLOSE += 4.2;
    signals.push("closure");
  }

  if (NEXT_QUESTION_MARKER.test(message)) {
    scores.CONTINUE += 2.0;
    signals.push("continue_marker");
  }

  if (DEICTIC_RECALL.test(message)) {
    scores.CONTINUE += 1.9;
    scores.QUERY += 1.9;
    scores.ACK += 1.2;
    scores.SHIFT += 0.9;
    signals.push("deictic_recall");
  } else if (QUERY_MARKER.test(message) && (message.length <= 48 || DEICTIC.test(message))) {
    scores.QUERY += 4.0;
    signals.push("query_marker");
  }

  if (message.length <= SHORT_UTTERANCE_MAX) {
    if (PASSIVE_ONLY.test(message) || PASSIVE_WITH_ACK.test(message)) {
      scores.PASSIVE += 4.2;
      signals.push("passive");
    } else if (ACK_RECEIPT.test(message)) {
      const lastAssistant = [...prior]
        .reverse()
        .find((turn) => turn.role === "assistant");
      const answersQuestion =
        hasContext &&
        Boolean(lastAssistant?.content.trim()) &&
        /[?？]/.test(lastAssistant!.content);

      if (answersQuestion) {
        scores.CONTINUE += 3.8;
        signals.push("ack_as_continue");
      } else {
        scores.ACK += 3.8;
        signals.push("ack");
      }
    }
  }

  if (NEW_TASK_CUE.test(message)) {
    scores.SHIFT += 3.2;
    scores.QUERY += 1.6;
    signals.push("new_task_cue");
  }

  if (ACTION_VERB.test(message) && !PASSIVE_ONLY.test(message)) {
    scores.QUERY += hasContext ? 2.4 : 3.6;
    signals.push("action_verb");
  }

  if (hasContext && message.length > SHORT_UTTERANCE_MAX && !signals.length) {
    scores.CONTINUE += 0.9;
    scores.QUERY += 0.6;
    signals.push("contextual_turn");
  }

  if (!hasContext && message.length > SHORT_UTTERANCE_MAX) {
    scores.QUERY += 1.4;
    signals.push("new_turn");
  }

  return { distribution: softmaxScores(scores), signals };
}

function softmaxScores(scores: Record<KernelMicroIntentKey, number>): MicroIntentDistribution {
  const keys = KERNEL_MICRO_INTENT_KEYS;
  const max = Math.max(...keys.map((key) => scores[key]));
  const exps = keys.map((key) => Math.exp(scores[key] - max));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  const out = {} as MicroIntentDistribution;
  keys.forEach((key, index) => {
    out[key] = exps[index]! / sum;
  });
  return out;
}

export function turnPressureFromDistribution(
  distribution: MicroIntentDistribution
): number {
  return (
    distribution.CONTINUE * 0.75 +
    distribution.QUERY * 0.7 +
    distribution.SHIFT * 0.55 +
    distribution.ACK * 0.15 +
    distribution.CLOSE * 0.05 +
    distribution.PASSIVE * 0.1
  );
}
