import type {
  AbstractionAnalysis,
  AbstractionLevel,
} from "@/lib/testing/unified-stress/types";

const L0_PATTERNS =
  /^(?:모르겠|답답|그냥|음\.{0,3}|흠|별로|글쎄|아\s*뭐\s*하지)$/iu;

const L1_PATTERNS =
  /^(?:추천|어떻게|뭐\s*하지|어떡해|뭐\s*하지\??|추천\s*해|어디\s*가지)$/iu;

const L3_SIGNALS =
  /(?:목표|기한|예산|제약|조건|까지|안\s*되|최대|최소|우선)/u;

const L4_SIGNALS =
  /(?:전략|루틴|최적|장기|시스템|설계|타임라인|로드맵|프레임)/u;

const L2_DOMAINS =
  /(?:수능|다이어트|이직|운동|공부|여행|맛집|일정|원룸|프로젝트|루틴)/u;

function levelOutput(
  level: AbstractionLevel
): AbstractionAnalysis["allowedOutput"] {
  switch (level) {
    case "L0":
    case "L1":
      return "question";
    case "L2":
      return "recommend";
    case "L3":
      return "plan";
    case "L4":
      return "system_design";
  }
}

/** Classify input into L0–L4 abstraction ladder. */
export function classifyAbstractionLevel(input: string): AbstractionAnalysis {
  const trimmed = input.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  if (L0_PATTERNS.test(trimmed) || (wordCount <= 2 && /답답|모르|그냥|힘들|피곤/u.test(trimmed))) {
    return {
      level: "L0",
      reason: "raw_emotion_or_noise",
      mustAskQuestion: true,
      allowedOutput: levelOutput("L0"),
    };
  }

  if (L1_PATTERNS.test(trimmed) || (wordCount <= 3 && /추천|어떻|뭐\s*하/u.test(trimmed))) {
    return {
      level: "L1",
      reason: "action_fragment_only",
      mustAskQuestion: true,
      allowedOutput: levelOutput("L1"),
    };
  }

  if (L4_SIGNALS.test(trimmed)) {
    return {
      level: "L4",
      reason: "system_or_routine_design",
      mustAskQuestion: false,
      allowedOutput: levelOutput("L4"),
    };
  }

  if (L3_SIGNALS.test(trimmed) && wordCount >= 4) {
    return {
      level: "L3",
      reason: "goal_constraint_partial",
      mustAskQuestion: false,
      allowedOutput: levelOutput("L3"),
    };
  }

  if (L2_DOMAINS.test(trimmed) || wordCount >= 3) {
    return {
      level: "L2",
      reason: "domain_intent_present",
      mustAskQuestion: false,
      allowedOutput: levelOutput("L2"),
    };
  }

  return {
    level: "L1",
    reason: "insufficient_structure",
    mustAskQuestion: true,
    allowedOutput: levelOutput("L1"),
  };
}
