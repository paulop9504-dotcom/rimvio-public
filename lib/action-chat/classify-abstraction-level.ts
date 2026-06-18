/**
 * L0–L4 abstraction ladder for routing decisions.
 * L0/L1 must not collapse into FOOD/meal fork.
 */

export type AbstractionLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export type AbstractionAnalysis = {
  level: AbstractionLevel;
  reason: string;
  mustAskQuestion: boolean;
};

const L0_PATTERNS =
  /^(?:모르겠|답답|그냥|음\.{0,3}|흠|별로|글쎄|아\s*뭐\s*하지)$/iu;

const L1_PATTERNS =
  /^(?:추천|어떻게|뭐\s*하지|어떡해|뭐\s*하지\??|추천\s*해|어디\s*가지)$/iu;

const L3_SIGNALS =
  /(?:목표|기한|예산|제약|조건|까지|안\s*되|최대|최소|우선)/u;

const L4_SIGNALS =
  /(?:전략|루틴|최적|장기|시스템|설계|타임라인|로드맵|프레임|재설계|갈아)/u;

const L2_DOMAINS =
  /(?:수능|다이어트|이직|운동|공부|여행|맛집|일정|원룸|프로젝트|루틴)/u;

const EMOTION_DISCLOSURE =
  /(?:우울|힘들|스트레스|짜증|속상|답답|외로|막막|burnout|번아웃|걱정|우울해)/iu;

export function classifyAbstractionLevel(input: string): AbstractionAnalysis {
  const trimmed = input.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  if (L0_PATTERNS.test(trimmed) || (wordCount <= 2 && /답답|모르|그냥|힘들|피곤/u.test(trimmed))) {
    return { level: "L0", reason: "raw_emotion_or_noise", mustAskQuestion: true };
  }

  if (
    EMOTION_DISCLOSURE.test(trimmed) &&
    !L2_DOMAINS.test(trimmed) &&
    !/(?:어떻게|방법|해결|극복)/u.test(trimmed)
  ) {
    return { level: "L0", reason: "emotional_disclosure", mustAskQuestion: true };
  }

  if (L1_PATTERNS.test(trimmed) || (wordCount <= 3 && /추천|어떻|뭐\s*하/u.test(trimmed))) {
    return { level: "L1", reason: "action_fragment_only", mustAskQuestion: true };
  }

  if (L4_SIGNALS.test(trimmed)) {
    return { level: "L4", reason: "system_or_routine_design", mustAskQuestion: false };
  }

  if (L3_SIGNALS.test(trimmed) && wordCount >= 4) {
    return { level: "L3", reason: "goal_constraint_partial", mustAskQuestion: false };
  }

  if (L2_DOMAINS.test(trimmed) || wordCount >= 3) {
    return { level: "L2", reason: "domain_intent_present", mustAskQuestion: false };
  }

  return { level: "L1", reason: "insufficient_structure", mustAskQuestion: true };
}

export function isLowAbstractionLevel(level: AbstractionLevel): boolean {
  return level === "L0" || level === "L1";
}
