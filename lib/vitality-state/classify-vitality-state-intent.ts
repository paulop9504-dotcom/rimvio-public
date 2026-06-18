/**
 * Sync gate only — blocks place-confirm for short inner-state phrasing.
 * Full classification is LLM-driven via classifyVitalityStateWithLlm().
 */

import { isVitalityGateLexiconMatch } from "@/lib/vitality-state/vitality-state-gate-lexicon";
import { isAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { shouldForceDecisionRoute } from "@/lib/action-chat/routing-patches/decision-priority-override";

const PLACE_MARKERS =
  /(?:역|점|카페|식당|병원|학교|공원|마트|편의점|호텔|센터|빌딩|타워|아파트|\d+\s*번\s*길|\d+\s*로\s*\d)/u;

const ACTION_INTENT =
  /https?:\/\/|맛집|길\s*찾|네비|일정\s*잡|예약|전화(?:해|걸)|추천|알려\s*줘|찾아\s*줘|검색|뭐\s*먹|먹을까|할까|갈까|식사|점심|저녁|아침|브런치|야식|메뉴/u;

/** Korean state / feeling phrase endings — structural, not a word list. */
const STATE_PHRASE_SHAPE =
  /(?:파|프|픈|픔|해|하|어|워|웠|음|다|요|봐|죽|겠|나|네|군|람|지|돼|래|냐|까)(?:[!?.~ㅋㅎㅠㅜ\s]*)?$/iu;

const PRIORITY_QUESTION =
  /(?:뭐(?:부터|를)|어디서\s*부터|무엇(?:부터|을)|우선순위|막막|정신\s*없)/u;

/**
 * True when message is likely inner state — used to skip place-confirm gates.
 * Does NOT perform full intent classification (LLM handles that).
 */
export function isVitalityStateUtterance(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 80) {
    return false;
  }
  if (shouldForceDecisionRoute(trimmed)) {
    return false;
  }
  if (ACTION_INTENT.test(trimmed)) {
    return false;
  }
  if (PLACE_MARKERS.test(trimmed)) {
    return false;
  }
  if (PRIORITY_QUESTION.test(trimmed)) {
    return true;
  }
  if (isVitalityGateLexiconMatch(trimmed)) {
    return true;
  }
  if (isAiIntentUtterance(trimmed)) {
    return false;
  }
  if (trimmed.length <= 40 && STATE_PHRASE_SHAPE.test(trimmed)) {
    return true;
  }
  return false;
}
