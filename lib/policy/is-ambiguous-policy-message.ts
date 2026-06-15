import { classifyContentPolicy } from "@/lib/policy/classify-content-policy";
import { isPlaceRecommendationQuery } from "@/lib/context-resolver/discovery/parse-find-place-intent";

/** Soft signals — may be BORDERLINE but not matched by hard rules. */
const AMBIGUOUS_POLICY_HINTS =
  /(?:재미\s*있|심심|장난|신박|비밀|속닥|속삭|연애|썸|고백|유머|엉뚱|과격|도발|flirt|nsfw|성적|애매|수치|민망|설렘|썸타|가십|뒷담|키스|스킨십|몸\s*매|유혹|선 넘|금기|금칙|위험한\s*얘기|이상한\s*얘기|야한\s*듯|좀\s*과한)/iu;

const CLEAR_ACTION_INTENT =
  /(?:일정|알람|리마인|길찾|티맵|번역|코드|프로그래|날씨|메모|저장|링크|캡처|송금|취소|예약|회의|미팅|브리핑|알려\s*줘|추천|찾아\s*줘|등록|확인)/iu;

/**
 * True when message should go to LLM policy wire (JSON only).
 * Skips clear SAFE action intents and messages already matched by rules.
 */
export function isAmbiguousPolicyMessage(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length < 6) {
    return false;
  }

  if (classifyContentPolicy(trimmed)) {
    return false;
  }

  if (isPlaceRecommendationQuery(trimmed)) {
    return false;
  }

  if (CLEAR_ACTION_INTENT.test(trimmed) && !AMBIGUOUS_POLICY_HINTS.test(trimmed)) {
    return false;
  }

  return AMBIGUOUS_POLICY_HINTS.test(trimmed);
}
