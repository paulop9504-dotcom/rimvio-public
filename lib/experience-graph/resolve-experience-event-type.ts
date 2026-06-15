import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ExperienceEventTypeId } from "@/lib/experience-graph/experience-event-type-spec";

const CONCERT_RE =
  /공연|콘서트|페스티벌|라이브|뮤지컬|콘서트홀|아레나|fest(?:ival)?/iu;
const SPORT_RE =
  /등산|러닝|마라톤|트레킹|클라이밍|서핑|자전거|헬스|운동|하이킹|trail|run(?:ning)?/iu;
const DATE_RE =
  /데이트|기념일|anniversary|발렌타인|화이트데이|프로포즈|커플|첫\s*만남/iu;
const FAMILY_RE =
  /가족|부모|엄마|아빠|아이|자녀|할머니|할아버지|생일파티|졸업/iu;
const DAILY_RE =
  /단골|카페|산책|동네|루틴|퇴근|출근|commute|daily/iu;
const TRAVEL_RE = /여행|trip|제주|오사카|방콕|해외|휴가|vacation/iu;

function inferFromTitle(title: string, place?: string | null): ExperienceEventTypeId | null {
  const hay = `${title} ${place ?? ""}`.trim();
  if (!hay) {
    return null;
  }
  if (CONCERT_RE.test(hay)) {
    return "concert";
  }
  if (SPORT_RE.test(hay)) {
    return "sport";
  }
  if (DATE_RE.test(hay)) {
    return "date";
  }
  if (FAMILY_RE.test(hay)) {
    return "family";
  }
  if (TRAVEL_RE.test(hay)) {
    return "travel";
  }
  if (DAILY_RE.test(hay)) {
    return "daily";
  }
  return null;
}

function fromCategory(category: EventCandidate["category"]): ExperienceEventTypeId | null {
  switch (category) {
    case "travel":
      return "travel";
    case "food":
      return "food";
    case "work":
      return "work";
    case "social":
      return "date";
    case "schedule":
      return "schedule";
    default:
      return null;
  }
}

/** Event SSOT → experience category for lens / prep / peaks. Pure read. */
export function resolveExperienceEventType(event: EventCandidate): ExperienceEventTypeId {
  const fromTitle = inferFromTitle(event.title, event.place);
  if (fromTitle) {
    return fromTitle;
  }

  const fromCat = fromCategory(event.category);
  if (fromCat) {
    return fromCat;
  }

  return "schedule";
}
