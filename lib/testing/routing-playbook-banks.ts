/**
 * Colloquial utterance banks for routing playbook loop (#1–#9 + #10 stress).
 * Rotate bank when round-10 fails or consecutive failures reach limit.
 */

export type PlaybookCategoryId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type RoutingWordBank = {
  id: string;
  label: string;
  /** #1 — must not return generic CLARIFY only */
  noGenericFallback: readonly string[];
  /** #2 — vitality/state; must not become entity quick pick */
  noEntityOnVitality: readonly string[];
  /** #3 — meal / place discovery */
  mealPlace: readonly string[];
  /** #4 — vitality gate + pipeline */
  vitality: readonly string[];
  /** #5 — bare brand/company; entity surface expected */
  entityBrand: readonly string[];
  /** #6 — should resolve on rules/deterministic path (no generic) */
  rulesFirst: readonly string[];
  /** #7 — structured payload headline (paired with empty summary fixtures in tests) */
  uiHeadline: readonly string[];
  /** #8 — regression anchors (stable routes) */
  regression: readonly string[];
  /** #9 — mixed colloquial one-liners */
  mixedColloquial: readonly string[];
  /** #10 — stress / long-tail phrasing for rotation trigger */
  stress: readonly string[];
};

export const ROUTING_WORD_BANKS: RoutingWordBank[] = [
  {
    id: "bank-seoul-daily",
    label: "서울 일상 구어",
    noGenericFallback: ["배고파", "졸려", "둔산동 맛집"],
    noEntityOnVitality: ["나 배고파", "스트레스", "피곤해"],
    mealPlace: ["강남역 맛집", "오늘 점심 추천", "대전 치킨 맛집"],
    vitality: ["배고파", "졸려요", "스트레스 받아"],
    entityBrand: ["쿠우쿠우", "삼성전자", "스타벅스"],
    rulesFirst: ["배고파", "둔산동 맛집", "쿠우쿠우"],
    uiHeadline: ["배고파", "애플", "쿠우쿠우"],
    regression: ["배고파", "둔산동 맛집", "삼성전자"],
    mixedColloquial: ["헉 배고파", "잠 온다", "역삼동 맛집"],
    stress: ["아 배고파 죽겠다", "둔산동에서 밥 뭐 먹지", "요즘 너무 스트레스야"],
  },
  {
    id: "bank-casual-chat",
    label: "카톡체 / 축약",
    noGenericFallback: ["뭐 먹지", "맛집", "졸려 죽겠"],
    noEntityOnVitality: ["졸려", "불안해", "심심해"],
    mealPlace: ["역삼동 맛집", "근처 맛집 추천", "저녁 뭐 먹을까"],
    vitality: ["피곤해", "지쳤어", "머리 아파"],
    entityBrand: ["애플", "코카콜라", "맥도날드"],
    rulesFirst: ["졸려", "강남역 맛집", "애플"],
    uiHeadline: ["스트레스", "코카콜라", "맥도날드"],
    regression: ["졸려", "강남역 맛집", "애플"],
    mixedColloquial: ["배고픔", "잠 와", "치킨 맛집 추천"],
    stress: ["진짜 배고파...", "오늘 너무 피곤함", "강남 쪽 맛집 알려줘"],
  },
  {
    id: "bank-polite-formal",
    label: "존댓말 / 완곡",
    noGenericFallback: ["배고픕니다", "졸립니다", "맛집 추천해주세요"],
    noEntityOnVitality: ["스트레스가 심해요", "피곤합니다", "불안합니다"],
    mealPlace: ["둔산동 맛집 추천", "점심 메뉴 추천", "서울역 근처 식당"],
    vitality: ["배고픕니다", "수면 부족해요", "과부하 상태예요"],
    entityBrand: ["삼성전자", "Apple", "Coca-Cola"],
    rulesFirst: ["배고픕니다", "둔산동 맛집", "Apple"],
    uiHeadline: ["배고픕니다", "삼성전자", "Apple"],
    regression: ["스트레스가 심해요", "둔산동 맛집 추천", "Apple"],
    mixedColloquial: ["식사 시간인데 뭐 먹죠", "좀 쉬고 싶어요", "맛집 찾아주세요"],
    stress: ["오늘 하루 종일 스트레스였어요", "둔산동 근처에서 저녁 먹을 곳", "너무 지쳐서 아무것도 하기 싫어요"],
  },
  {
    id: "bank-regional-food",
    label: "지역·음식 키워드",
    noGenericFallback: ["대구 맛집", "부산 맛집", "배고프다"],
    noEntityOnVitality: ["배고프다", "녹초", "막막해"],
    mealPlace: ["대구 맛집", "부산역 맛집", "유성구 맛집"],
    vitality: ["목말라", "막막해", "외로워"],
    entityBrand: ["이디야", "교촌치킨", "네이버"],
    rulesFirst: ["대구 맛집", "목말라", "이디야"],
    uiHeadline: ["대구 맛집", "교촌치킨", "네이버"],
    regression: ["배고프다", "유성구 맛집", "교촌치킨"],
    mixedColloquial: ["점심 뭐먹을까", "갈증나", "치킨 시킬까"],
    stress: ["대전 둔산동 맛집 좀", "배고파서 집중 안됨", "뭐부터 해야 할지 모르겠어"],
  },
  {
    id: "bank-korean-core-combos",
    label: "한국어 고빈도 조합 (명사+동사+형용사+부사)",
    noGenericFallback: ["지금 너무 힘들어", "오늘 뭐 하지", "근처 카페 추천해줘"],
    noEntityOnVitality: ["진짜 피곤해", "정말 스트레스야", "그냥 졸려"],
    mealPlace: ["저녁 뭐 먹을까", "근처 맛집 좀", "오늘 점심 뭐먹지"],
    vitality: ["너무 힘들어", "지금 배고파", "갑자기 불안해"],
    entityBrand: ["스타벅스", "맥도날드", "네이버"],
    rulesFirst: ["지금 배고파", "근처 카페 추천해줘", "삼성전자"],
    uiHeadline: ["졸려", "애플", "역삼동 맛집"],
    regression: ["스트레스 받아", "대전 맛집", "코카콜라"],
    mixedColloquial: ["뭐 먹지 그냥", "시간 없어 바빠", "집 가고 싶어"],
    stress: [
      "지금 상황 너무 힘든데 뭐부터 해야 하지",
      "근처 카페 추천해줘 커피 마시고 싶어",
      "오늘 일 진짜 많아서 점심 뭐먹을까",
    ],
  },
  {
    id: "bank-cafe-qa",
    label: "카페 QA — 브랜드 다양성",
    noGenericFallback: ["근처 카페 추천해줘", "대전 카페", "조용한 카페 찾아줘"],
    noEntityOnVitality: ["배고파", "피곤해"],
    mealPlace: ["둔산동 맛집", "맛집 추천"],
    vitality: ["배고파", "졸려"],
    entityBrand: ["쿠우쿠우", "이디야"],
    rulesFirst: ["근처 카페 추천해줘", "카페 추천", "커피 마시고 싶어"],
    uiHeadline: ["근처 카페 추천해줘", "스타벅스", "카페"],
    regression: ["근처 카페 추천해줘", "강남역 맛집", "애플"],
    mixedColloquial: ["카페 갈까", "커피 한잔", "디저트 카페"],
    stress: ["대전 근처 카페 5곳", "지금 근처 카페 추천", "조용한 카페 알려줘"],
  },
];

export function pickRoundUtterances(bank: RoutingWordBank): Record<PlaybookCategoryId, string> {
  return {
    1: bank.noGenericFallback[0]!,
    2: bank.noEntityOnVitality[0]!,
    3: bank.mealPlace[0]!,
    4: bank.vitality[0]!,
    5: bank.entityBrand[0]!,
    6: bank.rulesFirst[0]!,
    7: bank.uiHeadline[0]!,
    8: bank.regression[0]!,
    9: bank.mixedColloquial[0]!,
    10: bank.stress[0]!,
  };
}

export function allBankUtterances(bank: RoutingWordBank): string[] {
  return [
    ...bank.noGenericFallback,
    ...bank.noEntityOnVitality,
    ...bank.mealPlace,
    ...bank.vitality,
    ...bank.entityBrand,
    ...bank.rulesFirst,
    ...bank.mixedColloquial,
    ...bank.stress,
  ];
}
