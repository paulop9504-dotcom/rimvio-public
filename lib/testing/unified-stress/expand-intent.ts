import { analyzeSemanticRouting } from "@/lib/action-chat/classify-semantic-routing-surface";
import type {
  ActionType,
  DomainTag,
  IntentExpansion,
  TimeScale,
} from "@/lib/testing/unified-stress/types";

const DOMAIN_PATTERNS: Array<{ tag: DomainTag; pattern: RegExp }> = [
  { tag: "food", pattern: /먹|맛집|배달|식당|배고|메뉴|점심|저녁/u },
  { tag: "schedule", pattern: /일정|스케줄|약속|캘린더|내일|모레/u },
  { tag: "place", pattern: /근처|어디|장소|카페|맛집|동네/u },
  { tag: "health", pattern: /건강|병원|약|다이어트|수면|컨디션/u },
  { tag: "exercise", pattern: /운동|헬스|런닝|요가|스트레칭/u },
  { tag: "money", pattern: /돈|가격|소비|절약|예산|월세|전세/u },
  { tag: "relationship", pattern: /친구|연인|가족|사람|관계|답장|연락/u },
  { tag: "work", pattern: /업무|회사|프로젝트|이직|면접|수능|공부/u },
  { tag: "routine", pattern: /루틴|습관|매일|아침|저녁|타임라인/u },
  { tag: "emotion", pattern: /힘들|스트레스|답답|우울|불안|피곤/u },
];

const TIME_PATTERNS: Array<{ scale: TimeScale; pattern: RegExp }> = [
  { scale: "now", pattern: /지금|당장|바로|급/u },
  { scale: "today", pattern: /오늘|오늘\s*밤|오늘\s*저녁/u },
  { scale: "week", pattern: /이번\s*주|주말|다음\s*주/u },
  { scale: "month", pattern: /이번\s*달|한\s*달|월간/u },
  { scale: "lifecycle", pattern: /졸업|이직|결혼|입학|이사|장기/u },
];

function inferActionType(message: string): ActionType {
  if (/추적|기록|얼마나|몇\s*번|체크/u.test(message)) return "tracking";
  if (/최적|효율|절약|줄이|늘리/u.test(message)) return "optimization";
  if (/일정|계획|짜|스케줄|루틴/u.test(message)) return "planning";
  return "decision";
}

function inferCoreIntent(message: string, domains: DomainTag[]): string {
  const semantic = analyzeSemanticRouting(message);
  if (domains.includes("food")) return "food_choice";
  if (domains.includes("schedule")) return "schedule_planning";
  if (domains.includes("work")) return "work_progress";
  if (domains.includes("health") || domains.includes("exercise")) return "health_behavior";
  if (domains.includes("money")) return "spending_decision";
  if (domains.includes("relationship")) return "social_interaction";
  if (semantic.domain === "emotion") return "emotional_reflection";
  if (semantic.domain === "comparison") return "option_comparison";
  return `${semantic.domain}_intent`;
}

function expandPotentialIntents(
  message: string,
  domains: DomainTag[],
  core: string
): string[] {
  const expanded = new Set<string>([core]);
  for (const domain of domains) {
    expanded.add(`${domain}_followup`);
  }
  if (/\+|그리고|도\s/u.test(message)) {
    expanded.add("multi_intent_split");
  }
  if (/추천|어떻게|뭐\s*하지/u.test(message)) {
    expanded.add("recommendation_request");
  }
  if (/vs|비교|고르/u.test(message)) {
    expanded.add("comparison_decision");
  }
  if (/일정|약속/u.test(message) && domains.includes("food")) {
    expanded.add("meal_schedule_combo");
  }
  return [...expanded].slice(0, 5);
}

/** (A) Intent decomposition + (B) Domain + (C) Time + (D) Action type. */
export function expandIntent(message: string): IntentExpansion {
  const trimmed = message.trim();
  const domainMapping: DomainTag[] = [];
  for (const { tag, pattern } of DOMAIN_PATTERNS) {
    if (pattern.test(trimmed)) domainMapping.push(tag);
  }
  if (domainMapping.length === 0) {
    const semantic = analyzeSemanticRouting(trimmed);
    domainMapping.push(
      semantic.domain === "general" || semantic.domain === "ambiguous"
        ? "general"
        : (semantic.domain as DomainTag)
    );
  }

  const timeScaling: TimeScale[] = [];
  for (const { scale, pattern } of TIME_PATTERNS) {
    if (pattern.test(trimmed)) timeScaling.push(scale);
  }
  if (timeScaling.length === 0) timeScaling.push("today");

  const intentCore = inferCoreIntent(trimmed, domainMapping);
  const expandedIntents = expandPotentialIntents(trimmed, domainMapping, intentCore);

  return {
    intentCore,
    expandedIntents,
    domainMapping: [...new Set(domainMapping)],
    timeScaling: [...new Set(timeScaling)],
    actionType: inferActionType(trimmed),
  };
}
