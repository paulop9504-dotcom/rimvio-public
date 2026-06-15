import type { ExperienceIntent, IntentEvidenceKind } from "@/lib/experience-intent/experience-intent-types";
import type { IntentScorerInput } from "@/lib/experience-intent/intent-scorer-input";

export type IntentSignalMatch = {
  id: string;
  weight: number;
  kind: IntentEvidenceKind;
  signal: string;
  source: string;
};

export type IntentSignalRule = {
  id: string;
  kind: IntentEvidenceKind;
  weight: number;
  label: string;
  test: (input: IntentScorerInput) => boolean;
};

export type IntentSignalSpec = {
  intent: ExperienceIntent;
  winThreshold: number;
  rules: readonly IntentSignalRule[];
};

function regexRule(
  id: string,
  kind: IntentEvidenceKind,
  weight: number,
  label: string,
  pattern: RegExp,
): IntentSignalRule {
  return {
    id,
    kind,
    weight,
    label,
    test: (input) => pattern.test(input.haystack) || pattern.test(input.title),
  };
}

function placeRule(
  id: string,
  weight: number,
  label: string,
  pattern: RegExp,
): IntentSignalRule {
  return {
    id,
    kind: "place",
    weight,
    label,
    test: (input) => {
      const hay = [input.place, ...input.distinctPlaceLabels].filter(Boolean).join(" ");
      return pattern.test(hay);
    },
  };
}

const WEDDING_TITLE = /결혼|웨딩|예식|청첩장|wedding|banquet|reception/iu;
const TRAVEL_TITLE = /여행|휴가|vacation|trip|제주|오사카|방콕|해외|관광/iu;
const BUSINESS_TITLE = /출장|업무|보고|deadline|마감|보고서|현장|출근/iu;
const MEETING_TITLE = /미팅|회의|meeting|약속|스타벅스에서 만나/iu;
const BIRTHDAY_TITLE = /생일|생신|생파|birthday|축하파티/iu;
const HOSPITAL_TITLE = /병원|치과|의원|진료|검진|클리닉/iu;
const SCHOOL_TITLE = /학교|학원|수업|강의|campus|대학교/iu;
const SPORT_TITLE =
  /등산|러닝|마라톤|트레킹|클라이밍|서핑|자전거|헬스|운동|하이킹|trail|run(?:ning)?/iu;
const FAMILY_TITLE = /가족|부모|엄마|아빠|아이|자녀|할머니|할아버지|졸업/iu;
const DATE_TITLE =
  /데이트|기념일|anniversary|발렌타인|화이트데이|프로포즈|커플|첫\s*만남/iu;
const FOOD_TITLE = /맛집|식당|카페|치킨|저녁|점심|배달|먹|파스타|브런치/iu;
const CONCERT_TITLE =
  /공연|콘서트|페스티벌|라이브|뮤지컬|콘서트홀|아레나|fest(?:ival)?/iu;
const FUNERAL_TITLE = /장례|부고|조문|추모|funeral|빈소|장례식장/iu;

const AIRPORT = /공항|항공|탑승|체크인|비행|flight|hotel|숙소|호텔/iu;
const WEDDING_PLACE = /웨딩홀|예식장|컨벤션|연회장|wedding\s*hall|banquet/iu;
const HOSPITAL_PLACE = /병원|치과|의원|클리닉|hospital/iu;
const SCHOOL_PLACE = /학교|학원|캠퍼스|campus/iu;
const FUNERAL_PLACE = /장례식장|빈소|funeral/iu;

/** Per-intent rule tables — evaluated independently (evidence voting). */
export const INTENT_SIGNAL_REGISTRY: readonly IntentSignalSpec[] = [
  {
    intent: "wedding",
    winThreshold: 55,
    rules: [
      regexRule("wedding-title", "title", 50, "title:wedding", WEDDING_TITLE),
      placeRule("wedding-place", 30, "place:wedding_hall", WEDDING_PLACE),
      {
        id: "wedding-attendees",
        kind: "participants",
        weight: 15,
        label: "calendar:attendees>=8",
        test: (input) => (input.calendar?.attendeeCount ?? 0) >= 8,
      },
      {
        id: "wedding-photos",
        kind: "captures",
        weight: 10,
        label: "captures:photos>=8",
        test: (input) => input.photoCount >= 8,
      },
      {
        id: "wedding-peer",
        kind: "peer_thread",
        weight: 10,
        label: "peer:thread+name",
        test: (input) =>
          Boolean(input.peerThreadId) && Boolean(input.peerDisplayName),
      },
      regexRule("wedding-anti-business", "title", -35, "anti:business", BUSINESS_TITLE),
      regexRule("wedding-anti-hospital", "title", -40, "anti:hospital", HOSPITAL_TITLE),
    ],
  },
  {
    intent: "travel",
    winThreshold: 50,
    rules: [
      regexRule("travel-title", "title", 45, "title:travel", TRAVEL_TITLE),
      regexRule("travel-air", "title", 25, "title:airport_hotel", AIRPORT),
      {
        id: "travel-category",
        kind: "category",
        weight: 20,
        label: "category:travel",
        test: (input) => input.category === "travel",
      },
      {
        id: "travel-multi-place",
        kind: "gps",
        weight: 15,
        label: "gps:multi_place>=2",
        test: (input) => input.distinctPlaceLabels.length >= 2,
      },
      {
        id: "travel-plan-window",
        kind: "calendar",
        weight: 10,
        label: "peer:plan_thread",
        test: (input) => Boolean(input.peerThreadId),
      },
      regexRule("travel-anti-business", "title", -30, "anti:business_trip", /출장/iu),
    ],
  },
  {
    intent: "business",
    winThreshold: 50,
    rules: [
      regexRule("business-trip", "title", 45, "title:business_trip", /출장/iu),
      regexRule("business-title", "title", 35, "title:work", BUSINESS_TITLE),
      regexRule("business-meeting", "title", 20, "title:meeting", /미팅|회의|meeting/iu),
      {
        id: "business-category",
        kind: "category",
        weight: 20,
        label: "category:work",
        test: (input) => input.category === "work",
      },
      regexRule("business-anti-leisure", "title", -25, "anti:leisure_travel", /휴가|관광/iu),
    ],
  },
  {
    intent: "meeting",
    winThreshold: 45,
    rules: [
      regexRule("meeting-title", "title", 40, "title:meeting", MEETING_TITLE),
      {
        id: "meeting-peer",
        kind: "peer_thread",
        weight: 20,
        label: "peer:1:1_thread",
        test: (input) => Boolean(input.peerThreadId && input.peerDisplayName),
      },
      {
        id: "meeting-schedule",
        kind: "calendar",
        weight: 15,
        label: "category:schedule+meeting",
        test: (input) =>
          input.category === "schedule" && MEETING_TITLE.test(input.haystack),
      },
      regexRule("meeting-place-cafe", "place", 10, "place:cafe_chain", /스타벅스|카페/iu),
    ],
  },
  {
    intent: "birthday",
    winThreshold: 50,
    rules: [
      regexRule("birthday-title", "title", 50, "title:birthday", BIRTHDAY_TITLE),
      regexRule("birthday-name", "title", 15, "title:name_birthday", /([가-힣]{2,8})\s*생일/u),
      {
        id: "birthday-social",
        kind: "category",
        weight: 15,
        label: "category:social",
        test: (input) => input.category === "social",
      },
      {
        id: "birthday-photos",
        kind: "captures",
        weight: 10,
        label: "captures:photos>=4",
        test: (input) => input.photoCount >= 4,
      },
    ],
  },
  {
    intent: "hospital",
    winThreshold: 50,
    rules: [
      regexRule("hospital-title", "title", 50, "title:hospital", HOSPITAL_TITLE),
      placeRule("hospital-place", 25, "place:hospital", HOSPITAL_PLACE),
      {
        id: "hospital-schedule",
        kind: "calendar",
        weight: 15,
        label: "category:schedule+hospital",
        test: (input) =>
          input.category === "schedule" && HOSPITAL_TITLE.test(input.haystack),
      },
      regexRule("hospital-anti-wedding", "title", -40, "anti:wedding", WEDDING_TITLE),
    ],
  },
  {
    intent: "school",
    winThreshold: 45,
    rules: [
      regexRule("school-title", "title", 45, "title:school", SCHOOL_TITLE),
      placeRule("school-place", 25, "place:school", SCHOOL_PLACE),
      regexRule("school-education", "description", 20, "desc:education", /수업|강의|lesson|tutor/iu),
    ],
  },
  {
    intent: "sports",
    winThreshold: 45,
    rules: [
      regexRule("sport-title", "title", 50, "title:sport", SPORT_TITLE),
      {
        id: "sport-dwell",
        kind: "dwell",
        weight: 15,
        label: "dwell:>=30min",
        test: (input) => (input.dwellMinutes ?? 0) >= 30,
      },
      {
        id: "sport-gps",
        kind: "gps",
        weight: 10,
        label: "captures:gps_dwell",
        test: (input) => input.gpsDwellCaptureCount >= 1,
      },
    ],
  },
  {
    intent: "family",
    winThreshold: 45,
    rules: [
      regexRule("family-title", "title", 45, "title:family", FAMILY_TITLE),
      {
        id: "family-participants",
        kind: "participants",
        weight: 15,
        label: "participants:family_terms",
        test: (input) => /엄마|아빠|가족|할머니|할아버지/u.test(input.haystack),
      },
      regexRule("family-birthday-party", "title", 20, "title:birthday_party", /생일파티/iu),
    ],
  },
  {
    intent: "date",
    winThreshold: 45,
    rules: [
      regexRule("date-title", "title", 45, "title:date", DATE_TITLE),
      {
        id: "date-social",
        kind: "category",
        weight: 15,
        label: "category:social",
        test: (input) => input.category === "social",
      },
      {
        id: "date-peer",
        kind: "peer_thread",
        weight: 15,
        label: "peer:display_name",
        test: (input) => Boolean(input.peerDisplayName),
      },
    ],
  },
  {
    intent: "food",
    winThreshold: 40,
    rules: [
      regexRule("food-title", "title", 45, "title:food", FOOD_TITLE),
      {
        id: "food-category",
        kind: "category",
        weight: 20,
        label: "category:food",
        test: (input) => input.category === "food",
      },
    ],
  },
  {
    intent: "concert",
    winThreshold: 45,
    rules: [
      regexRule("concert-title", "title", 50, "title:concert", CONCERT_TITLE),
      {
        id: "concert-video",
        kind: "captures",
        weight: 10,
        label: "captures:video>=1",
        test: (input) => input.videoCount >= 1,
      },
    ],
  },
  {
    intent: "funeral",
    winThreshold: 55,
    rules: [
      regexRule("funeral-title", "title", 55, "title:funeral", FUNERAL_TITLE),
      placeRule("funeral-place", 30, "place:funeral_hall", FUNERAL_PLACE),
    ],
  },
  {
    intent: "other",
    winThreshold: 0,
    rules: [
      {
        id: "other-fallback",
        kind: "category",
        weight: 5,
        label: "fallback:schedule",
        test: (input) => input.category === "schedule",
      },
      {
        id: "other-custom",
        kind: "category",
        weight: 3,
        label: "fallback:custom",
        test: (input) => input.category === "custom",
      },
    ],
  },
];

export function intentSpecFor(
  intent: ExperienceIntent,
): IntentSignalSpec | undefined {
  return INTENT_SIGNAL_REGISTRY.find((spec) => spec.intent === intent);
}
