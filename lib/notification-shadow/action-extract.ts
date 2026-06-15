import { buildKakaoMapSearchHref } from "@/lib/resolvers/deep-links";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";
import type { CanonicalContainerKey } from "@/lib/containers/container-types";
import type {
  FutureActionType,
  FutureActionWire,
  NotificationEventInput,
} from "@/lib/notification-shadow/types";
import { ruleClassifyNotification } from "@/lib/notification-shadow/rule-classify";

function minutesUntil(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) {
    return null;
  }
  const ms = new Date(iso).getTime() - now;
  if (Number.isNaN(ms)) {
    return null;
  }
  return Math.round(ms / 60_000);
}

function parseMeetingMinutes(text: string): number | null {
  const match = text.match(/(\d+)\s*분\s*(?:전|뒤|후)/);
  if (match?.[1]) {
    return Number.parseInt(match[1], 10);
  }
  return null;
}

export function extractFutureActions(input: NotificationEventInput): FutureActionWire[] {
  const blob = `${input.source_app} ${input.title} ${input.content}`.toLowerCase();
  const classified = ruleClassifyNotification(input);
  const actions: FutureActionWire[] = [];

  const push = (action: FutureActionWire) => {
    if (!actions.some((entry) => entry.type === action.type)) {
      actions.push(action);
    }
  };

  if (/zoom|줌/i.test(blob)) {
    push({
      type: "OPEN_ZOOM",
      label: "Zoom 참가",
      deepLink: "zoomus://",
      container: "calendar_planner",
      confidence: 0.92,
      showAt: input.fire_at ?? undefined,
    });
  }

  if (/google\s*meet|meet\.google/i.test(blob)) {
    push({
      type: "JOIN_MEETING",
      label: "Meet 참가",
      deepLink: "https://meet.google.com/",
      container: "calendar_planner",
      confidence: 0.9,
    });
  }

  if (/미팅|회의|calendar|일정/i.test(blob) && actions.length === 0) {
    push({
      type: "OPEN_CALENDAR",
      label: "일정 보기",
      deepLink: "calshow://",
      container: "calendar_planner",
      confidence: 0.85,
    });
  }

  if (/배달|배송|coupang|쿠팡|baemin|배민/i.test(blob)) {
    push({
      type: "TRACK_PACKAGE",
      label: "배송 조회",
      deepLink: /coupang|쿠팡/i.test(blob)
        ? "coupang://order/tracking"
        : undefined,
      confidence: 0.9,
    });
  }

  if (/slack/i.test(blob)) {
    push({
      type: "OPEN_SLACK",
      label: "Slack 열기",
      deepLink: "slack://open",
      confidence: 0.88,
    });
  }

  if (/kakaotalk|카카오톡|카톡/i.test(blob)) {
    push({
      type: "OPEN_KAKAOTALK",
      label: "카톡 열기",
      deepLink: "kakaotalk://",
      confidence: 0.86,
    });
  }

  if (/gmail|mail|메일/i.test(blob)) {
    push({
      type: "OPEN_EMAIL",
      label: "메일 열기",
      deepLink: "googlegmail://",
      confidence: 0.84,
    });
  }

  if (/bitcoin|btc|비트코인|코인|exchange|거래소/i.test(blob)) {
    push({
      type: "OPEN_EXCHANGE",
      label: "차트 보기",
      container: "bitcoin_trader",
      confidence: 0.87,
    });
  }

  if (/뉴스|news|브리핑|속보/i.test(blob)) {
    push({
      type: "FETCH_RELATED_NEWS",
      label: "브리핑",
      container: "news_briefing",
      confidence: 0.8,
    });
  }

  if (/버스|지하철|역\b|길\s*찾|내비|navigation/i.test(blob)) {
    const dest =
      input.content.match(/(?:까지|으로)\s*(.+?)(?:\s|$)/)?.[1]?.trim() ??
      input.title.trim();
    push({
      type: "OPEN_NAVIGATION",
      label: "길 찾기",
      deepLink: dest ? buildKakaoMapSearchHref(dest) : undefined,
      container: "transport_guard",
      confidence: 0.88,
    });
  }

  if (/택시|kakaot/i.test(blob)) {
    push({
      type: "OPEN_NAVIGATION",
      label: "택시 확인",
      deepLink: KAKAO_T_APP_OPEN,
      container: "transport_guard",
      confidence: 0.85,
    });
  }

  if (input.internal_kind === "link_reminder" && input.content.includes("http")) {
    push({
      type: "OPEN_LINK",
      label: "링크 열기",
      deepLink: input.content.match(/https?:\/\/\S+/)?.[0],
      confidence: 0.95,
    });
  }

  if (actions.length === 0 && classified.category !== "SPAM") {
    const url = `${input.title} ${input.content}`.match(/https?:\/\/\S+/)?.[0];
    if (url) {
      push({
        type: "OPEN_LINK",
        label: "열기",
        deepLink: url,
        confidence: 0.7,
      });
    }
  }

  const meetingIn = parseMeetingMinutes(`${input.title} ${input.content}`);
  const until = minutesUntil(input.fire_at);
  if (meetingIn != null && meetingIn <= 10) {
    for (const action of actions) {
      if (action.type === "OPEN_ZOOM" || action.type === "JOIN_MEETING") {
        action.showAt = input.fire_at ?? undefined;
      }
    }
  } else if (until != null && until <= 10 && until >= 0) {
    for (const action of actions) {
      action.showAt = input.fire_at ?? undefined;
    }
  }

  return actions;
}

export function hasActionableFuture(actions: FutureActionWire[]): boolean {
  return actions.some((action) => Boolean(action.label && (action.deepLink || action.type)));
}
