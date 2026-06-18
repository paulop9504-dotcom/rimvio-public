import type { ExperienceMode, ExperienceWeights } from "@/lib/experience/types";

const SOCIAL_MEMORY =
  /친구|여행|제주|놀|내기|추억|기념|낭만|함께|단체|모임|파티|게임|돌맹이|바다|sunset|뷰|분위기/u;

const EFFICIENCY_SIGNAL =
  /효율|최단|가성비|싸게|할인|편의점|빨리|일정\s*빡|타이트|업무|미팅|deadline|마감/u;

const SOLO_APEX = /혼자|집중|업무|출근|deadline|마감|코딩|공부/u;

export function inferExperienceMode(message: string): ExperienceMode {
  const trimmed = message.trim();
  const social = SOCIAL_MEMORY.test(trimmed);
  const efficiency = EFFICIENCY_SIGNAL.test(trimmed);
  const solo = SOLO_APEX.test(trimmed);

  if (social && !solo) {
    return "MEMORY";
  }
  if (efficiency && solo && !social) {
    return "EFFICIENCY";
  }
  if (social && efficiency) {
    return "MEMORY";
  }
  if (efficiency) {
    return "EFFICIENCY";
  }
  return "BALANCED";
}

export function experienceWeights(mode: ExperienceMode): ExperienceWeights {
  if (mode === "MEMORY") {
    return { mode, efficiency: 0.2, memory: 0.8 };
  }
  if (mode === "EFFICIENCY") {
    return { mode, efficiency: 0.85, memory: 0.15 };
  }
  return { mode, efficiency: 0.55, memory: 0.45 };
}

const EFFICIENCY_TRAP =
  /편의점|싸게|가격|할인|가까운|최단|먼저\s*사|사올|사줄|효율/u;

const FOOD_MOMENT = /아이스크림|간식|먹|카페|디저트|맥주|간단히/u;

/** Social trip + efficiency shortcut — suggest ASK_CHOICE, not answer. */
export function isEfficiencyTrapInSocialContext(message: string): boolean {
  const trimmed = message.trim();
  return SOCIAL_MEMORY.test(trimmed) && EFFICIENCY_TRAP.test(trimmed);
}

export function isMemoryMomentQuery(message: string): boolean {
  const trimmed = message.trim();
  return (
    SOCIAL_MEMORY.test(trimmed) &&
    (FOOD_MOMENT.test(trimmed) || /분위기|뷰|낭만|추억|어디가\s*좋/u.test(trimmed))
  );
}
