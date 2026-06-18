import { buildKakaoMapSearchHref } from "@/lib/resolvers/deep-links";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";
import { TOSS_APP_OPEN, TOSS_WEB } from "@/lib/remote/payment-links";
import type { DeepLinkToolDefinition } from "@/lib/deep-link-dispatch/types";

function enc(value: string) {
  return encodeURIComponent(value.trim());
}

export const DEEP_LINK_TOOLS: DeepLinkToolDefinition[] = [
  {
    id: "kakaonavi-navigate",
    intent: "NAVIGATION",
    targetApp: "KakaoNavi",
    triggers: [/카카오\s*내비|카카오내비|길\s*찾|내비\s*켜|navigation|navigate/i],
    params: [{ key: "destination", label: "목적지" }],
    build(ctx) {
      const destRaw =
        ctx.params.destination?.trim() ||
        ctx.message.match(/(?:까지|으로|로\s*가|길\s*찾)\s*(.+?)(?:\s*$|\.)/i)?.[1]?.trim();
      if (destRaw) {
        return buildKakaoMapSearchHref(destRaw);
      }
      if (ctx.params.x && ctx.params.y) {
        return `kakaonavi://navigate?x=${enc(ctx.params.x)}&y=${enc(ctx.params.y)}`;
      }
      return null;
    },
    buildMissingMessage: () => "어디로 안내할까요? 목적지를 알려주세요.",
  },
  {
    id: "toss-transfer",
    intent: "FINANCE",
    targetApp: "Toss",
    triggers: [/토스|송금|보내\s*줘|이체|transfer/i],
    params: [{ key: "amount", label: "금액" }],
    build(ctx) {
      if (!ctx.params.amount) {
        return null;
      }
      const bank = ctx.params.bank ? `&bank=${enc(ctx.params.bank)}` : "";
      return `${TOSS_APP_OPEN}transfer?amount=${enc(ctx.params.amount)}${bank}`;
    },
    buildMissingMessage: () => "얼마를 보낼까요? (예: 5만원)",
  },
  {
    id: "kakaopay-transfer",
    intent: "FINANCE",
    targetApp: "KakaoPay",
    triggers: [/카카오\s*페이|카페\s*송금|kakaopay/i],
    params: [{ key: "amount", label: "금액" }],
    build(ctx) {
      if (!ctx.params.amount) {
        return null;
      }
      return `kakaotalk://kakaopay/transfer?amount=${enc(ctx.params.amount)}`;
    },
    buildMissingMessage: () => "카카오페이로 얼마를 보낼까요?",
  },
  {
    id: "notion-open",
    intent: "MEMO",
    targetApp: "Notion",
    triggers: [/노션|notion|메모\s*띄|메모\s*열/i],
    params: [{ key: "pageId", label: "페이지 ID" }],
    build(ctx) {
      if (ctx.params.pageId) {
        return `notion://open?pageId=${enc(ctx.params.pageId)}`;
      }
      return "notion://";
    },
    buildMissingMessage: () => "어떤 노션 페이지를 열까요?",
  },
  {
    id: "sms-compose",
    intent: "COMMUNICATION",
    targetApp: "Messages",
    triggers: [/문자\s*(보내|써|작성)|sms|문자\s*창/i],
    params: [
      { key: "number", label: "번호" },
      { key: "body", label: "내용" },
    ],
    build(ctx) {
      const number =
        ctx.params.number ||
        ctx.message.match(/(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/)?.[1]?.replace(/\s/g, "");
      const body =
        ctx.params.body ||
        ctx.message.match(/["「『](.+?)["」』]/)?.[1]?.trim();
      if (!number) {
        return null;
      }
      const qs = body ? `?body=${enc(body)}` : "";
      return `sms:${number}${qs}`;
    },
    buildMissingMessage: () => "누구에게 문자를 보낼까요? 번호를 알려주세요.",
  },
  {
    id: "kakaotalk-friends",
    intent: "COMMUNICATION",
    targetApp: "KakaoTalk",
    triggers: [/카톡|카카오\s*톡|톡\s*방|채팅\s*방/i],
    params: [],
    build: () => "kakaotalk://talk/friends",
    buildMissingMessage: () => "카카오톡을 열까요?",
  },
  {
    id: "tel-dial",
    intent: "COMMUNICATION",
    targetApp: "Phone",
    triggers: [/전화\s*(걸|해|해줘)|통화/i],
    params: [{ key: "number", label: "번호" }],
    build(ctx) {
      const number =
        ctx.params.number ||
        ctx.message.match(/(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/)?.[1]?.replace(/\s/g, "");
      if (!number) {
        return null;
      }
      return `tel:${number}`;
    },
    buildMissingMessage: () => "누구에게 전화할까요?",
  },
  {
    id: "spotify-open",
    intent: "MEDIA_SYSTEM",
    targetApp: "Spotify",
    triggers: [/스포티파이|spotify|플레이\s*리스트\s*틀/i],
    params: [],
    build: () => "spotify://",
    buildMissingMessage: () => "스포티파이를 열까요?",
  },
  {
    id: "youtube-open",
    intent: "MEDIA_SYSTEM",
    targetApp: "YouTube",
    triggers: [/유튜브|youtube/i],
    params: [],
    build: () => "youtube://",
    buildMissingMessage: () => "유튜브를 열까요?",
  },
  {
    id: "kakao-taxi",
    intent: "MOBILITY",
    targetApp: "KakaoT",
    triggers: [/택시\s*(불|호|잡)|카카오\s*t|카카오t/i],
    params: [],
    build: () => KAKAO_T_APP_OPEN,
    buildMissingMessage: () => "카카오T 택시 호출 화면을 열까요?",
  },
  {
    id: "uber-request",
    intent: "MOBILITY",
    targetApp: "Uber",
    triggers: [/우버|uber/i],
    params: [],
    build: () => "uber://?action=setPickup&pickup=my_location",
    buildMissingMessage: () => "우버 호출 화면을 열까요?",
  },
  {
    id: "smartthings",
    intent: "SMARTHOME",
    targetApp: "SmartThings",
    triggers: [/스마트\s*싱스|smartthings|IoT|거실\s*불|에어컨\s*틀/i],
    params: [],
    build: () => "smartthings://",
    buildMissingMessage: () => "스마트싱스를 열까요?",
  },
  {
    id: "philips-hue",
    intent: "SMARTHOME",
    targetApp: "Philips Hue",
    triggers: [/휴\s*조명|hue|조명\s*켜/i],
    params: [],
    build: () => "hue://",
    buildMissingMessage: () => "Philips Hue 앱을 열까요?",
  },
  {
    id: "samsung-health",
    intent: "HEALTH",
    targetApp: "Samsung Health",
    triggers: [/삼성\s*헬스|samsung\s*health|운동\s*시작|물\s*마/i],
    params: [],
    build: () => "samsunghealth://",
    buildMissingMessage: () => "삼성 헬스를 열까요?",
  },
  {
    id: "coupang-tracking",
    intent: "SHOPPING",
    targetApp: "Coupang",
    triggers: [/쿠팡|배송\s*조회|택배\s*어디/i],
    params: [],
    build: () => "coupang://order/tracking",
    buildMissingMessage: () => "쿠팡 배송 현황을 열까요?",
  },
  {
    id: "naverpay",
    intent: "SHOPPING",
    targetApp: "NaverPay",
    triggers: [/네이버\s*페이|naverpay|결제\s*내역/i],
    params: [],
    build: () => "naverpay://",
    buildMissingMessage: () => "네이버페이를 열까요?",
  },
];

export function getDeepLinkToolById(id: string) {
  return DEEP_LINK_TOOLS.find((tool) => tool.id === id) ?? null;
}

export function resolveWebFallbackForTool(toolId: string, deepLink: string): string | null {
  if (toolId === "toss-transfer") {
    return TOSS_WEB;
  }
  if (toolId === "kakaonavi-navigate" && deepLink.startsWith("kakaomap://")) {
    return `http://m.map.kakao.com/scheme/search${deepLink.split("search")[1] ?? ""}`;
  }
  return null;
}
