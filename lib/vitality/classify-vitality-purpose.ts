import type { VitalityTag } from "@/lib/vitality/types";
import { isVitalityTag } from "@/lib/vitality/types";

/** Prompt block — injected into system prompts for LLM vitality tagging. */
export const VITALITY_CLASSIFICATION_PRINCIPLES = `# Vitality 분류 원칙 (Context Mapping)

분류 시 반드시 다음 질문을 스스로 수행하라:
1. 사용자 입력에서 **행동의 목적**을 먼저 파악한다.
2. 단어만 보지 말고 **문맥(Context)** 을 분석한다.
   (예: "친구랑 커피" → 커피가 목적이 아니라 **친구(관계)** 가 핵심 → Nexus)

## 카테고리 정의 (단어 예시는 참고만)
- **Apex (업무/생산성)**: 무언가 결과를 만들거나, 수익을 내거나, 실력을 향상시키는 활동.
  - 핵심 질문: "이 활동을 통해 **결과물(산출물)** 이 나오는가?"
- **Haven (휴식/개인)**: 나 자신의 에너지를 회복하거나, 개인적인 정비를 하는 활동.
  - 핵심 질문: "**나 혼자** 의 상태를 개선하거나 휴식하는 것인가?"
- **Nexus (관계/연결)**: 타인과 소통하거나 관계를 맺는 모든 활동.
  - 핵심 질문: "**누군가와 상호작용** 하는 것인가?"
- **Sentinel (경고/긴급)**: 미래의 위기를 방지하거나, 기한을 지키기 위한 강제적 활동.
  - 핵심 질문: "**지금 안 하면** 나중에 문제가 생기는가?"

## 분류 규칙 (절대 준수)
- '기타'는 없다. 가장 가까운 축을 선택한다.
- 특정 단어 포함만으로 분류하지 말고 **문장의 의도**를 분석한다.`;

const EXPLICIT_TAG = /\((Apex|Haven|Nexus|Sentinel)\)/i;

const SOCIAL_ACTOR =
  /(?:친구|가족|엄마|아빠|부모|연인|남친|여친|아내|남편|동료|팀원|손님|고객|선배|후배|지인|상대|그\s?사람)/u;

const SOCIAL_INTERACTION =
  /(?:미팅|meeting|회의|면접|약속|만남|데이트|식사\s*약속|회식|모임|통화|전화\s*약속|같이|함께|랑\s|와\s|하고\s|랑$|와$)/u;

const PRODUCTIVITY =
  /(?:업무|프로젝트|발표|데드라인|deadline|집중|코딩|개발|작업|근무|출근|공부|시험|자격증|포트폴리오|매출|수익|영업|리포트|과제|과제\s*제출)/iu;

const URGENCY =
  /(?:마감|기한|연체|세금|신고\s*기한|치과|병원|검진|수술|항공|비행|기차|출발|탑승|노쇼|위약|필수\s*일정|꼭\s*가야|안\s*하면\s*문제)/u;

const SOLO_REST =
  /(?:혼자|휴식|힐링|재충전|산책|헤어|미용|네일|마사지|미용실|헤어숍|네일숍|영화|쇼핑|스파|사우나)/u;

const SOLO_LEISURE =
  /(?:카페|커피|놀|맛집|식사|점심|저녁|브런치|디저트)/u;

function parseExplicitVitality(text: string): VitalityTag | null {
  const match = text.match(EXPLICIT_TAG)?.[1];
  if (!match) {
    return null;
  }
  const normalized =
    match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
  return isVitalityTag(normalized) ? normalized : null;
}

function hasSocialPurpose(text: string): boolean {
  return SOCIAL_ACTOR.test(text) || SOCIAL_INTERACTION.test(text);
}

function scoreSocialPurpose(text: string): number {
  let score = 0;
  if (SOCIAL_ACTOR.test(text)) {
    score += 3;
  }
  if (SOCIAL_INTERACTION.test(text)) {
    score += 2;
  }
  if (/약속|만남|데이트/u.test(text)) {
    score += 2;
  }
  return score;
}

function scoreProductivityPurpose(text: string): number {
  let score = 0;
  if (PRODUCTIVITY.test(text)) {
    score += 3;
  }
  if (/(?:집중\s*시간|딥\s*워크|deep\s*work)/iu.test(text)) {
    score += 2;
  }
  if (/회의|미팅/u.test(text) && /(?:업무|프로젝트|발표|고객|클라이언트)/u.test(text)) {
    score += 2;
  }
  return score;
}

function scoreUrgencyPurpose(text: string): number {
  let score = 0;
  if (URGENCY.test(text)) {
    score += 3;
  }
  if (/(?:중요|긴급|필수|must|critical)/iu.test(text)) {
    score += 1;
  }
  return score;
}

function scoreSoloRestPurpose(text: string): number {
  if (hasSocialPurpose(text)) {
    return 0;
  }

  let score = 0;
  if (SOLO_REST.test(text)) {
    score += 3;
  }
  if (SOLO_LEISURE.test(text)) {
    score += 2;
  }
  if (/혼자/u.test(text)) {
    score += 2;
  }
  return score;
}

function pickHighestScore(scores: Record<VitalityTag, number>): VitalityTag {
  const order: VitalityTag[] = ["Sentinel", "Nexus", "Apex", "Haven"];
  let best: VitalityTag = "Nexus";
  let bestScore = -1;

  for (const tag of order) {
    if (scores[tag] > bestScore) {
      bestScore = scores[tag];
      best = tag;
    }
  }
  return best;
}

/** Purpose-first vitality classification — no orphan "기타". */
export function classifyVitalityByPurpose(text: string): VitalityTag {
  const normalized = text.trim();
  if (!normalized) {
    return "Nexus";
  }

  const explicit = parseExplicitVitality(normalized);
  if (explicit) {
    return explicit;
  }

  const scores: Record<VitalityTag, number> = {
    Nexus: scoreSocialPurpose(normalized),
    Apex: scoreProductivityPurpose(normalized),
    Sentinel: scoreUrgencyPurpose(normalized),
    Haven: scoreSoloRestPurpose(normalized),
  };

  const social = scores.Nexus;
  const productivity = scores.Apex;
  const urgency = scores.Sentinel;
  const soloRest = scores.Haven;

  if (urgency >= 3 && social < 3) {
    return "Sentinel";
  }

  if (social >= 2) {
    return "Nexus";
  }

  if (productivity >= 2) {
    return "Apex";
  }

  if (soloRest >= 2) {
    return "Haven";
  }

  const maxScore = Math.max(social, productivity, urgency, soloRest);
  if (maxScore === 0) {
    return "Nexus";
  }

  return pickHighestScore(scores);
}

/** Whether text describes solo personal-care (used for reschedule cost heuristics). */
export function isSoloPersonalCareActivity(text: string): boolean {
  return scoreSoloRestPurpose(text) >= 2;
}
