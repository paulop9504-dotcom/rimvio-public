import type { ExperienceLensId } from "@/lib/experience-graph/resolve-experience-lens";

/** User-facing experience category — broader than engine `EventCandidate.category`. */
export type ExperienceEventTypeId =
  | "travel"
  | "daily"
  | "date"
  | "concert"
  | "sport"
  | "food"
  | "work"
  | "family"
  | "schedule";

export type ExperiencePrepFlags = {
  weather: boolean;
  traffic: boolean;
  peer: boolean;
};

export type ExperienceEventTypeSpec = {
  id: ExperienceEventTypeId;
  label: string;
  emoji: string;
  prep: ExperiencePrepFlags;
  /** Lens chip copy when that lens is active. */
  lensLabels: Record<ExperienceLensId, string>;
  /** Peak query hints — used when projecting volumes. */
  peakHints: {
    space: string;
    moment?: string;
    dwell?: string;
  };
};

export const EXPERIENCE_EVENT_TYPE_SPECS: readonly ExperienceEventTypeSpec[] = [
  {
    id: "travel",
    label: "여행",
    emoji: "✈️",
    prep: { weather: true, traffic: true, peer: true },
    lensLabels: {
      now: "지금 · 출발·이동",
      soon: "곧 · 짐·이동 확인",
      then: "그때 · peak 다시보기",
      where: "어디 · 체류 지도",
    },
    peakHints: {
      space: "에서 가장 행복했던 공간",
      moment: "에서 가장 낭만 있던 순간",
      dwell: "가장 길게 머문 구간",
    },
  },
  {
    id: "daily",
    label: "일상",
    emoji: "☕",
    prep: { weather: false, traffic: false, peer: false },
    lensLabels: {
      now: "지금 · 오늘 루틴",
      soon: "곧 · 단골 코스",
      then: "그때 · 편했던 순간",
      where: "어디 · 동네 blob",
    },
    peakHints: {
      space: "에서 가장 편했던 공간",
      dwell: "가장 자주 머문 구간",
    },
  },
  {
    id: "date",
    label: "데이트",
    emoji: "💫",
    prep: { weather: true, traffic: true, peer: true },
    lensLabels: {
      now: "지금 · 만남·이동",
      soon: "곧 · 장소·시간 확인",
      then: "그때 · 낭만 순간",
      where: "어디 · 둘만의 장소",
    },
    peakHints: {
      space: "에서 가장 행복했던 공간",
      moment: "에서 가장 낭만 있던 순간",
    },
  },
  {
    id: "concert",
    label: "공연",
    emoji: "🎤",
    prep: { weather: false, traffic: true, peer: true },
    lensLabels: {
      now: "지금 · 입장·좌석",
      soon: "곧 · 티켓·이동",
      then: "그때 · 라이브 peak",
      where: "어디 · 공연장",
    },
    peakHints: {
      space: "에서 가장 오래 있던 자리",
      moment: "에서 가장 소리 컸던 순간",
    },
  },
  {
    id: "sport",
    label: "운동",
    emoji: "🏃",
    prep: { weather: true, traffic: false, peer: true },
    lensLabels: {
      now: "지금 · 코스·컨디션",
      soon: "곧 · 장비·날씨",
      then: "그때 · 피크 구간",
      where: "어디 · 코스 지도",
    },
    peakHints: {
      space: "에서 가장 힘들었던 구간",
      moment: "에서 정상·피크 순간",
      dwell: "가장 긴 코스 구간",
    },
  },
  {
    id: "food",
    label: "맛집",
    emoji: "🍽",
    prep: { weather: false, traffic: true, peer: true },
    lensLabels: {
      now: "지금 · 예약·대기",
      soon: "곧 · 이동·예약 확인",
      then: "그때 · 인생 한 끼",
      where: "어디 · 맛집 지도",
    },
    peakHints: {
      space: "에서 가장 맛있었던 한 끼",
      moment: "에서 가장 기억에 남는 순간",
    },
  },
  {
    id: "work",
    label: "업무",
    emoji: "💼",
    prep: { weather: false, traffic: true, peer: false },
    lensLabels: {
      now: "지금 · 이동·미팅",
      soon: "곧 · 자료·이동",
      then: "그때 · 현장 맥락",
      where: "어디 · 현장·오피스",
    },
    peakHints: {
      space: "에서 가장 집중했던 공간",
    },
  },
  {
    id: "family",
    label: "가족",
    emoji: "👨‍👩‍👧",
    prep: { weather: true, traffic: true, peer: true },
    lensLabels: {
      now: "지금 · 모임·이동",
      soon: "곧 · 일정·준비",
      then: "그때 · 가족 peak",
      where: "어디 · 모임 장소",
    },
    peakHints: {
      space: "에서 가장 웃었던 공간",
      moment: "에서 가장 따뜻했던 순간",
    },
  },
  {
    id: "schedule",
    label: "일정",
    emoji: "📅",
    prep: { weather: true, traffic: true, peer: false },
    lensLabels: {
      now: "지금 · 바로 실행",
      soon: "곧 · 시간 확인",
      then: "그때 · 기록 다시보기",
      where: "어디 · 장소",
    },
    peakHints: {
      space: "에서 가장 오래 머문 공간",
    },
  },
] as const;

const SPEC_BY_ID = new Map(
  EXPERIENCE_EVENT_TYPE_SPECS.map((spec) => [spec.id, spec] as const),
);

export function experienceEventTypeById(
  id: ExperienceEventTypeId | undefined,
): ExperienceEventTypeSpec {
  return SPEC_BY_ID.get(id ?? "schedule") ?? SPEC_BY_ID.get("schedule")!;
}
