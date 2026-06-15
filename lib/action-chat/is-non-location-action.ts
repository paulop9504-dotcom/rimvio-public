import { stripUiNoise } from "@/lib/action-chat/clean-entity-text";

/** Task/info actions from Action Architect dock — never require place confirmation. */
const TASK_NOUN =
  /(?:항공권|체크리스트|짐\s*체크|기록지|플레이리스트|운동\s*루틴|회의\s*자료|미팅\s*링크|할\s*일|todo|비용\s*기록|영수증)/iu;

const IMPERATIVE_TAIL =
  /(?:해\s*줘|해주세요|해\s*주세요|해\s*줄래|부탁(?:해|해\s*줘)?|만들어\s*줘|확인(?:해|해\s*줘|해\s*주세요)?|알려\s*줘|등록(?:해|해\s*줘)?|예약(?:해|해\s*줘)?|열어\s*줘|공유(?:해|해\s*줘)?|기록(?:해|해\s*줘)?|정리(?:해|해\s*줘)?|작성(?:해|해\s*줘)?)(?:[!?.~ㅋㅎ\s]*)$/iu;

const IMPERATIVE_HEAD =
  /^(?:확인|예약|등록|만들|정리|작성|열|공유|기록|검색|찾(?:아)?|추천|알려|챙겨|준비)(?:어|아|해|아\s*줘|어\s*줘)/iu;

const PLACE_SIGNAL =
  /(?:역$|공항|터미널|병원|치과|약국|카페|식당|갤러리아|스타벅스|이마트|홈플러스|코스트코|올리브영|cgv|메가박스|둔산|강남|역삼|타임월드|센터시티|도안|월드컵|\d+\s*층|(?:로|길|번길)\s*\d+)/iu;

/**
 * True when the message is a task/action command — not a navigable place label.
 * Dock chips (항공권, 짐 체크리스트, …) must skip place-confirm pipeline.
 */
export function isNonLocationActionCommand(message: string): boolean {
  const trimmed = stripUiNoise(message.trim());
  if (!trimmed) {
    return false;
  }

  if (IMPERATIVE_TAIL.test(trimmed) || IMPERATIVE_HEAD.test(trimmed)) {
    if (!PLACE_SIGNAL.test(trimmed)) {
      return true;
    }
  }

  if (TASK_NOUN.test(trimmed) && !PLACE_SIGNAL.test(trimmed)) {
    return true;
  }

  return false;
}
