import { RIMVIO_CONVERSATION_LINES } from "@/lib/action-chat/rimvio-persona";

import type {

  FallbackRecoveryCandidate,

  FallbackRecoveryInference,

} from "@/lib/action-chat/fallback-recovery/types";

import {

  CAREER_ASPIRATION_PATTERN,

  extractCareerRoleHint,

  isCareerAspirationMessage,

} from "@/lib/action-chat/fallback-recovery/career-role-bank";



const FORBIDDEN_FALLBACK =

  /(?:잠시\s*문제|다시\s*말씀(?:해)?\s*주세요|처리(?:할|가)?\s*수\s*없)/iu;



const EDUCATION =

  /(?:공부|시험|수능|입시|학원|대학|전공|자격증\s*준비)/iu;

const COUNSELING =

  /(?:힘들|막막|걱정|불안|우울|모르겠|답답|스트레스)/iu;

const MEAL = /(?:먹|맛집|배고|점심|저녁|식사|메뉴)/iu;

const SCHEDULE = /(?:일정|약속|미팅|회의|캘린더|내일|오늘\s*오후)/iu;

const DECISION = /(?:vs|추천|뭐\s*하지|어떡해|고르|선택)/iu;



export function isForbiddenFallbackText(text: string | null | undefined): boolean {

  const trimmed = text?.trim();

  if (!trimmed) {

    return true;

  }

  if (FORBIDDEN_FALLBACK.test(trimmed)) {

    return true;

  }

  if (trimmed === RIMVIO_CONVERSATION_LINES.fallback) {

    return true;

  }

  return false;

}



const GENERIC_STUB =

  /(?:지금\s*상태에\s*맞게|무엇을\s*도와|도와드릴게요\.?$|잠시\s*만요)/iu;



export function isWeakGenericSummary(text: string | null | undefined): boolean {

  const trimmed = text?.trim();

  if (!trimmed) {

    return true;

  }

  if (trimmed.length < 22 && !/A\)|👉/u.test(trimmed)) {

    return true;

  }

  return GENERIC_STUB.test(trimmed);
}



export function isGenericRecoveryEligible(

  text: string | null | undefined,

  userMessage: string

): boolean {

  const trimmed = text?.trim();

  if (!trimmed) {

    return true;

  }

  if (isForbiddenFallbackText(trimmed)) {

    return true;

  }

  if (isWeakGenericSummary(trimmed)) {

    return true;

  }

  const user = userMessage.trim();

  if (!user) {

    return false;

  }

  if (

    trimmed === RIMVIO_CONVERSATION_LINES.greeting ||

    trimmed === "안녕하세요. 무엇을 도와드릴까요?"

  ) {

    return !/^(?:ㅎㅇ|하이|안녕|hello|hi)/iu.test(user);

  }

  return false;

}



export function inferFallbackRecovery(message: string): FallbackRecoveryInference {

  const trimmed = message.trim();

  const candidates = new Set<FallbackRecoveryCandidate>();



  if (isCareerAspirationMessage(trimmed)) {

    candidates.add("career_planning");

  }

  if (EDUCATION.test(trimmed)) {

    candidates.add("education_planning");

  }

  if (COUNSELING.test(trimmed)) {

    candidates.add("counseling");

  }

  if (MEAL.test(trimmed)) {

    candidates.add("meal_decision");

  }

  if (SCHEDULE.test(trimmed)) {

    candidates.add("schedule_planning");

  }

  if (DECISION.test(trimmed)) {

    candidates.add("general_decision");

  }



  if (candidates.size === 0) {

    candidates.add("exploration");

  }



  let primary: FallbackRecoveryCandidate = "exploration";

  if (candidates.has("career_planning")) {

    primary = "career_planning";

  } else if (candidates.has("schedule_planning")) {

    primary = "schedule_planning";

  } else if (candidates.has("meal_decision")) {

    primary = "meal_decision";

  } else if (candidates.has("counseling")) {

    primary = "counseling";

  } else if (candidates.has("education_planning")) {

    primary = "education_planning";

  } else if (candidates.has("general_decision")) {

    primary = "general_decision";

  }



  const roleHint = extractCareerRoleHint(trimmed);



  return {

    primary,

    candidates: [...candidates],

    roleHint,

  };

}



export { isCareerAspirationMessage, CAREER_ASPIRATION_PATTERN };


