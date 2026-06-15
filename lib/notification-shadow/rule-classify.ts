import type { CanonicalContainerKey } from "@/lib/containers/container-types";
import type { ShadowCategory } from "@/lib/notification-shadow/types";

export type RuleClassifyResult = {
  category: ShadowCategory;
  base_urgency: number;
  reason: string;
  container_hint: CanonicalContainerKey | "UNKNOWN";
};

const OTP_PATTERN =
  /(?:인증\s*번호|OTP|verification\s*code|보안\s*코드|\b\d{4,8}\b.*(?:인증|확인))/i;
const PAYMENT_PATTERN = /(?:결제\s*(?:완료|승인)|payment\s*(?:confirmed|approved)|영수증)/i;
const DELIVERY_ARRIVAL_PATTERN =
  /(?:배달\s*(?:도착|왔|곧)|배송\s*(?:도착|완료|시작)|도착\s*했|곧\s*도착)/i;
const BOARDING_PATTERN = /(?:탑승|boarding|게이트\s*오픈|check-?in\s*open)/i;
const RIDE_ARRIVAL_PATTERN = /(?:기사\s*도착|차량\s*도착|드라이버\s*도착)/i;
const EMERGENCY_PATTERN = /(?:긴급|emergency|119|112|화재|침입)/i;

const SPAM_PATTERN =
  /(?:쿠폰|할인|프로모션|광고|마케팅|event\s*sale|\d+%\s*off|지금\s*구매)/i;

const WORK_APPS =
  /(?:slack|teams|jira|notion|zoom|gmail|outlook|google\s*meet|microsoft)/i;
const WORK_CONTENT = /(?:미팅|회의|멘션|mention|deadline|jira|승인\s*요청)/i;

const PERSONAL_APPS = /(?:kakaotalk|카카오톡|telegram|whatsapp|message|문자)/i;
const PERSONAL_CONTENT = /(?:엄마|아빠|가족|친구|direct\s*message|dm)/i;

const PASSIVE_PATTERN =
  /(?:뉴스|news|좋아요|like|follow|추천|market\s*update|시황|속보)/i;

const BTC_PATTERN = /(?:bitcoin|btc|비트코인|crypto|코인|급등|급락)/i;
const TRANSPORT_PATTERN = /(?:버스|지하철|열차|택시|교통|도착\s*예정|정거장)/i;
const SCHEDULE_PATTERN = /(?:일정|캘린더|calendar|미팅|회의|appointment)/i;

function hintContainer(text: string): CanonicalContainerKey | "UNKNOWN" {
  if (BTC_PATTERN.test(text)) {
    return "bitcoin_trader";
  }
  if (TRANSPORT_PATTERN.test(text)) {
    return "transport_guard";
  }
  if (SCHEDULE_PATTERN.test(text) || /zoom|meet/i.test(text)) {
    return "calendar_planner";
  }
  if (PASSIVE_PATTERN.test(text) && /뉴스|news|브리핑/i.test(text)) {
    return "news_briefing";
  }
  return "UNKNOWN";
}

export function ruleClassifyNotification(input: {
  source_app: string;
  title: string;
  content: string;
}): RuleClassifyResult {
  const blob = `${input.source_app} ${input.title} ${input.content}`.trim();
  const container_hint = hintContainer(blob);

  if (SPAM_PATTERN.test(blob)) {
    return {
      category: "SPAM",
      base_urgency: 0,
      reason: "프로모션/광고 패턴",
      container_hint,
    };
  }

  if (OTP_PATTERN.test(blob)) {
    return {
      category: "CRITICAL",
      base_urgency: 100,
      reason: "OTP/인증 코드",
      container_hint,
    };
  }

  if (PAYMENT_PATTERN.test(blob)) {
    return {
      category: "CRITICAL",
      base_urgency: 98,
      reason: "결제/승인 알림",
      container_hint,
    };
  }

  if (DELIVERY_ARRIVAL_PATTERN.test(blob)) {
    return {
      category: "CRITICAL",
      base_urgency: 95,
      reason: "배달/배송 도착",
      container_hint,
    };
  }

  if (BOARDING_PATTERN.test(blob) || RIDE_ARRIVAL_PATTERN.test(blob)) {
    return {
      category: "CRITICAL",
      base_urgency: 94,
      reason: "탑승/차량 도착",
      container_hint,
    };
  }

  if (EMERGENCY_PATTERN.test(blob)) {
    return {
      category: "CRITICAL",
      base_urgency: 100,
      reason: "긴급 알림",
      container_hint,
    };
  }

  if (WORK_APPS.test(blob) || WORK_CONTENT.test(blob)) {
    const bossDm = /(?:ceo|대표|director|boss|대표님)/i.test(blob);
    return {
      category: "WORK",
      base_urgency: bossDm ? 88 : 72,
      reason: bossDm ? "업무 Direct 멘션" : "업무 알림",
      container_hint,
    };
  }

  if (PERSONAL_APPS.test(blob) || PERSONAL_CONTENT.test(blob)) {
    return {
      category: "PERSONAL",
      base_urgency: /(?:엄마|아빠|가족)/i.test(blob) ? 82 : 68,
      reason: "개인 메시지",
      container_hint,
    };
  }

  if (PASSIVE_PATTERN.test(blob)) {
    return {
      category: "PASSIVE",
      base_urgency: BTC_PATTERN.test(blob) ? 55 : 35,
      reason: "정보/소셜 알림",
      container_hint,
    };
  }

  return {
    category: "PASSIVE",
    base_urgency: 40,
    reason: "일반 알림",
    container_hint,
  };
}
