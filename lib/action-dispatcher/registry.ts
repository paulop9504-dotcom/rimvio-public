import { buildKakaoMapSearchHref, buildNaverMapSearchWebHref } from "@/lib/resolvers/deep-links";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";
import { TOSS_APP_OPEN, TOSS_WEB } from "@/lib/remote/payment-links";
import type { ActionIntentDefinition } from "@/lib/action-dispatcher/types";

function enc(value: string) {
  return encodeURIComponent(value.trim());
}

function pickParam(params: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = params[key]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

/** Canonical Action ID registry — backend resolves URLs; LLM must not invent schemes. */
export const ACTION_INTENT_REGISTRY: Record<string, ActionIntentDefinition> = {
  TAXI_CALL: {
    id: "TAXI_CALL",
    label: "택시 호출",
    description: "Call a taxi to a destination (Kakao T)",
    params: ["dest", "destination"],
    fallback_url: "https://map.naver.com",
    buildUrl(params) {
      const dest = pickParam(params, "dest", "destination");
      if (dest) {
        return `kakaot://call?dest=${enc(dest)}`;
      }
      return KAKAO_T_APP_OPEN;
    },
  },
  NAVIGATE: {
    id: "NAVIGATE",
    label: "길찾기",
    description: "Open navigation to a destination",
    params: ["dest", "destination"],
    fallback_url: "https://map.naver.com",
    buildUrl(params) {
      const dest = pickParam(params, "dest", "destination");
      return dest ? buildKakaoMapSearchHref(dest) : null;
    },
  },
  NAVER_MAP_SEARCH: {
    id: "NAVER_MAP_SEARCH",
    label: "네이버 지도 검색",
    description: "Search a place on Naver Map (web fallback friendly)",
    params: ["query", "dest", "destination"],
    fallback_url: "https://map.naver.com",
    buildUrl(params) {
      const query = pickParam(params, "query", "dest", "destination");
      return query ? buildNaverMapSearchWebHref(query) : null;
    },
  },
  TEL_CALL: {
    id: "TEL_CALL",
    label: "전화 걸기",
    description: "Dial a phone number",
    params: ["number", "phone"],
    fallback_url: "tel:",
    buildUrl(params) {
      const number = pickParam(params, "number", "phone")?.replace(/\s/g, "");
      return number ? `tel:${number}` : null;
    },
  },
  SMS_COMPOSE: {
    id: "SMS_COMPOSE",
    label: "문자 작성",
    description: "Open SMS composer",
    params: ["number", "body"],
    fallback_url: "sms:",
    buildUrl(params) {
      const number = pickParam(params, "number")?.replace(/\s/g, "");
      if (!number) {
        return null;
      }
      const body = pickParam(params, "body");
      return body ? `sms:${number}?body=${enc(body)}` : `sms:${number}`;
    },
  },
  TOSS_TRANSFER: {
    id: "TOSS_TRANSFER",
    label: "토스 송금",
    description: "Open Toss transfer screen",
    params: ["amount", "bank"],
    fallback_url: TOSS_WEB,
    buildUrl(params) {
      const amount = pickParam(params, "amount");
      if (!amount) {
        return null;
      }
      const bank = pickParam(params, "bank");
      return bank
        ? `${TOSS_APP_OPEN}transfer?amount=${enc(amount)}&bank=${enc(bank)}`
        : `${TOSS_APP_OPEN}transfer?amount=${enc(amount)}`;
    },
  },
  KAKAOPAY_TRANSFER: {
    id: "KAKAOPAY_TRANSFER",
    label: "카카오페이 송금",
    description: "Open KakaoPay transfer",
    params: ["amount"],
    fallback_url: "https://pay.kakao.com",
    buildUrl(params) {
      const amount = pickParam(params, "amount");
      return amount ? `kakaotalk://kakaopay/transfer?amount=${enc(amount)}` : null;
    },
  },
  KAKAOTALK_OPEN: {
    id: "KAKAOTALK_OPEN",
    label: "카카오톡 열기",
    description: "Open KakaoTalk friends list",
    params: [],
    fallback_url: "https://www.kakaocorp.com/page/service/service/KakaoTalk",
    buildUrl: () => "kakaotalk://talk/friends",
  },
  FLIGHT_CHECK: {
    id: "FLIGHT_CHECK",
    label: "항공권 확인",
    description: "Open flight status / booking check (in-app handoff)",
    params: ["flight_no", "date"],
    fallback_url: "https://www.google.com/travel/flights",
    buildUrl(params) {
      const flight = pickParam(params, "flight_no");
      if (flight) {
        return `rimvio://trip/flight?flight=${enc(flight)}`;
      }
      return "rimvio://trip/flight";
    },
  },
  PACKING_CHECKLIST: {
    id: "PACKING_CHECKLIST",
    label: "짐 체크리스트",
    description: "Open trip packing checklist",
    params: ["trip_id"],
    fallback_url: "rimvio://trip/packing",
    buildUrl: () => "rimvio://trip/packing",
  },
  WEB_SEARCH: {
    id: "WEB_SEARCH",
    label: "웹 검색",
    description: "Fallback web search when no native action fits",
    params: ["query"],
    fallback_url: "https://www.google.com",
    buildUrl(params) {
      const query = pickParam(params, "query");
      return query ? `https://www.google.com/search?q=${enc(query)}` : null;
    },
  },
  YOUTUBE_OPEN: {
    id: "YOUTUBE_OPEN",
    label: "유튜브 열기",
    description: "Open YouTube / YouTube Music app",
    params: ["query"],
    fallback_url: "https://www.youtube.com",
    buildUrl(params) {
      const query = pickParam(params, "query");
      return query ? `youtube://results?search_query=${enc(query)}` : "youtube://";
    },
  },
};

export function getActionIntentDefinition(actionId: string): ActionIntentDefinition | null {
  const normalized = actionId.trim().toUpperCase();
  return ACTION_INTENT_REGISTRY[normalized] ?? null;
}

export function listActionIntentDefinitions(): ActionIntentDefinition[] {
  return Object.values(ACTION_INTENT_REGISTRY);
}
