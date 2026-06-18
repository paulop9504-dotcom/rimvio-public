/**
 * Colloquial AI-assistant question shapes — 이해 / 실행 / 결정 (+ 창작·상담·메타).
 * Used to skip kernel CLARIFY and route to conversation before action cards.
 */

export type AiIntentCategory =
  | "INFO"
  | "HOW_TO"
  | "DECISION"
  | "CREATION"
  | "COUNSELING"
  | "CURIOSITY";

const HARD_ACTION_OS =
  /https?:\/\/|맛집|길\s*찾|네비|일정\s*잡|예약|010[-\s]?\d{4}|(?:역|동|구)\s*(?:근처|맛집)|카페\s*추천|식당\s*추천|(?:\d{1,3}\s*시간\s*(?:뒤|후)|\d{1,3}\s*분\s*(?:뒤|후)).*(?:여행|출장|오사카|제주|도쿄)|(?:여행(?:간|감|가)|출장).*(?:오사카|제주|도쿄|공항)/iu;

const MEAL_FOOD_HINT =
  /(?:먹(?:을|지|을까|지\?)?|맛집|배달|점심|저녁|아침|식사|메뉴|끼니|음식|치킨|시킬까|브런치|야식|배고(?:파|프|픈|픈데))/iu;

const COUNSELING =
  /(?:인간관계|연애|회사\s*문제|직장|상사|이별|헤어|싸웠|실연|외로|우울|답답|막막|힘든?|스트레스|속상|걱정|자책|번아웃|burnout|상담|어떻게\s*생각|잘\s*하고\s*있|이\s*상황|상황\s*어떻)/iu;

const CURIOSITY =
  /(?:너(?:는|가)|당신(?:은|이)|\bAI\b|GPT|클로드|모델\s*차이|작동|인간(?:을|이)\s*대체|생각\s*있|의식|미래\s*어떻)/iu;

const CREATION =
  /(?:써\s*줘|작성(?:해)?|대본|이메일|편지|글\s*(?:써|작)|요약\s*해|기획|아이디어|이름\s*지|만들어\s*줘|\bdraft\b|\bwrite\b)/iu;

const DECISION =
  /(?:\bvs\b|뭐가\s*(?:더\s*)?(?:좋|나|맞)|추천|사도\s*돼|해도\s*돼|(?:이\s*)?방향\s*맞|위험(?:해|한)?|어떤\s*게\s*(?:좋|나)|선택|고르(?:아|면)|지금\s*뭐\s*하(?:는|면)|어디\s*(?:살|가)|괜찮(?:아|을)?|살아(?:도|야)|어떡(?:해|하지)|뭐\s*하(?:지|지\?))/iu;

const HOW_TO =
  /(?:어떻게\s*해|방법|단계(?:별)?|시작(?:하)?|설정|초보|만드(?:는\s*)?방법|뭐(?:부터|를\s*먼저)|해야\s*돼|해야\s*할|일정\s*(?:정리|짜|뭐)|여행\s*일정|스케줄\s*정리|계획\s*알려|알려\s*줘.*(?:계획|일정)|(?:옷|의류|신발|가방|패션|쇼핑).*(?:사|살|구매|추천)|(?:사야(?:함|요|)|살\s*거|구매).{0,8}(?:옷|의류)?|옷\s*사(?:야|야함|을))/iu;

const INFO =
  /(?:뭐(?:야|임|ㅇ|인|뜻)|설명|차이(?:점)?|왜\s*(?:이|그|이런|그런)|쉽게|예시|meaning|explain|what\s*is|어떻게\s*되는)/iu;

const HOUSING_IN_COMPOUND =
  /(?:원룸|월세|전세|살(?:아|기|까)|동네|지역\s*괜찮)/iu;

function hasInfoShapeInMessage(message: string): boolean {
  return INFO.test(message) || /^이거\s/u.test(message);
}

/** Classify common AI-chat question shapes. Returns null when message is action-OS scoped. */
export function classifyAiIntentUtterance(message: string): AiIntentCategory | null {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 200) {
    return null;
  }

  if (HARD_ACTION_OS.test(trimmed)) {
    return null;
  }

  if (MEAL_FOOD_HINT.test(trimmed)) {
    return null;
  }

  /** Compound: bare INFO shape + food/place/housing domain → defer to action OS. */
  if (
    hasInfoShapeInMessage(trimmed) &&
    (MEAL_FOOD_HINT.test(trimmed) ||
      HARD_ACTION_OS.test(trimmed) ||
      HOUSING_IN_COMPOUND.test(trimmed))
  ) {
    return null;
  }

  if (COUNSELING.test(trimmed) && !/(?:맛집|메뉴|먹|카페\s*추천)/iu.test(trimmed)) {
    return "COUNSELING";
  }

  if (CURIOSITY.test(trimmed)) {
    return "CURIOSITY";
  }

  if (CREATION.test(trimmed)) {
    return "CREATION";
  }

  if (DECISION.test(trimmed) && !/(?:맛집|메뉴|먹|카페|배고)/iu.test(trimmed)) {
    return "DECISION";
  }

  if (HOW_TO.test(trimmed)) {
    return "HOW_TO";
  }

  if (INFO.test(trimmed) || /^이거\s/u.test(trimmed)) {
    return "INFO";
  }

  if (/[?？]/.test(trimmed) && trimmed.length <= 48 && !MEAL_FOOD_HINT.test(trimmed) && !HOUSING_IN_COMPOUND.test(trimmed) && !/(?:역|맛집|카페|식당)/iu.test(trimmed)) {
    return "INFO";
  }

  return null;
}

export function isAiIntentUtterance(message: string): boolean {
  return classifyAiIntentUtterance(message) !== null;
}
