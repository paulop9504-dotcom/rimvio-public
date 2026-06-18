import { resolveMentionNavigateDestination } from "@/lib/action-chat/mention-navigate/commit-mention-navigate-turn";
import {
  buildInlineChatActionWire,
  type InlineChatActionWire,
} from "@/lib/action-chat/mention-actions/inline-chat-action";
import { MENTION_ACTION_ICONS } from "@/lib/action-chat/mention-actions/mention-action-inline-features";
import { parseMentionTransferQuery } from "@/lib/action-chat/mention-transfer/parse-mention-transfer-query";
import {
  formatMentionReminderWhen,
  parseMentionReminderFireAt,
} from "@/lib/action-chat/mention-reminder/parse-mention-reminder-query";
import { buildMentionManualCatalog } from "@/lib/action-chat/mention-manual/build-mention-manual-catalog";
import { normalizeFriendContactQuery } from "@/lib/peer-chat/normalize-friend-contact";
import type { MentionFeature } from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import { resolvePluginDeeplink } from "@/lib/action-spawn/resolve-plugin-deeplink";
import {
  buildKakaoMapSearchHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";

const URL_PATTERN = /^https?:\/\//iu;

function formatWon(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function encodeSearch(query: string): string {
  return encodeURIComponent(query.trim());
}

function buildReminderSummary(query: string, referenceDate: string): string[] {
  if (!query.trim()) {
    return [];
  }
  const fireAt = parseMentionReminderFireAt(query, referenceDate);
  if (fireAt) {
    return [`알림 시각 ${formatMentionReminderWhen(fireAt)}`, query.trim()];
  }
  return [query.trim()];
}

function resolveDestination(query: string, fallback: string): string {
  return resolveMentionNavigateDestination(query) ?? (query.trim() || fallback);
}

/** Slim @ inline wire — deprecated utility features removed; NL → orchestrator. */
export function buildMentionActionWire(input: {
  feature: MentionFeature;
  query: string;
  referenceDate?: string;
  lastAction?: {
    featureId: string;
    query: string;
    mainDeeplink?: string;
    mainLabel: string;
  } | null;
}): InlineChatActionWire | null {
  const { feature, query } = input;
  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const icon = MENTION_ACTION_ICONS[feature.featureId] ?? "⚡";
  const q = query.trim();

  switch (feature.featureId) {
    case "meal": {
      const keyword = q || "맛집";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${keyword} 추천`],
        mainLabel: "네이버 맛집",
        mainDeeplink: `https://map.naver.com/p/search/${encodeSearch(keyword)}`,
        auxActions: [
          {
            id: "kakao",
            label: "카카오맵",
            icon: "K",
            deeplink: buildKakaoMapSearchHref(keyword),
          },
        ],
      });
    }

    case "taxi": {
      const dest = resolveDestination(q, "강남역");
      const taxi =
        resolvePluginDeeplink("kakao.taxi", { destination: dest, label: dest }) ??
        `https://taxi.kakao.com/?dest=${encodeSearch(dest)}`;
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`목적지 ${dest}`],
        mainLabel: "카카오T 호출",
        mainDeeplink: taxi,
        auxActions: [
          {
            id: "nav",
            label: "길찾기",
            icon: "🧭",
            deeplink: buildKakaoMapSearchHref(dest),
          },
        ],
      });
    }

    case "link": {
      const url = URL_PATTERN.test(q) ? q : "";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: url ? [url] : ["URL을 붙여 넣거나 적어 주세요."],
        mainLabel: url ? "링크 열기" : "클립보드에서 URL",
        mainDeeplink: url || undefined,
        mainActionKind: url ? "deeplink" : "clipboard",
      });
    }

    case "dutch": {
      const transfer = parseMentionTransferQuery(q);
      const summary = transfer.dutchSummary
        ? [
            `총액 ${formatWon(transfer.dutchSummary.totalWon)}`,
            `인원 ${transfer.dutchSummary.headcount}명`,
            `1인당 ${formatWon(transfer.dutchSummary.perPersonWon)}`,
          ]
        : ["예: @더치 84000 4명"];
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: summary,
        mainLabel:
          transfer.amountWon != null && transfer.dutchSummary
            ? `1인 ${formatWon(transfer.dutchSummary.perPersonWon)}`
            : "더치페이 계산",
        mainDeeplink:
          transfer.provider === "kakaopay"
            ? "https://link.kakaopay.com/bridge/wallet/home"
            : "https://toss.me/",
        auxActions: [
          {
            id: "transfer",
            label: "송금",
            icon: "💸",
            deeplink: "https://toss.me/",
          },
        ],
      });
    }

    case "delivery": {
      const keyword = q || "치킨";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${keyword} 배달`],
        mainLabel: "배민",
        mainDeeplink: `https://www.baemin.com/search?q=${encodeSearch(keyword)}`,
        auxActions: [
          {
            id: "coupang",
            label: "쿠팡이츠",
            icon: "C",
            deeplink: `https://www.coupangeats.com/mobile/search?q=${encodeSearch(keyword)}`,
          },
        ],
      });
    }

    case "pickup": {
      const place = q || "스타벅스";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${place} 픽업`],
        mainLabel: "픽업 주문",
        mainDeeplink:
          resolvePluginDeeplink("order.pickup", { label: place }) ??
          `https://www.google.com/search?q=${encodeSearch(`${place} 픽업 주문`)}`,
        auxActions: [
          {
            id: "map",
            label: "지도",
            icon: "🗺",
            deeplink: buildKakaoMapSearchHref(place),
          },
        ],
      });
    }

    case "gas": {
      const area = q || "주유소";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${area} 최저가 주유소`],
        mainLabel: "네이버 지도",
        mainDeeplink: buildNaverMapSearchWebHref(`${area} 주유소`),
        auxActions: [
          {
            id: "kakao",
            label: "카카오맵",
            icon: "K",
            deeplink: buildKakaoMapSearchHref(`${area} 주유소`),
          },
        ],
      });
    }

    case "todo":
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: buildReminderSummary(q, referenceDate).length
          ? buildReminderSummary(q, referenceDate)
          : q
            ? [q]
            : ["할 일을 적어 주세요."],
        mainLabel: "할 일 알림",
        mainDeeplink: `rimvio://reminder/create?title=${encodeSearch(q || "할 일")}`,
      });

    case "receipt":
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: ["영수증 촬영 후 금액·날짜를 확인합니다."],
        mainLabel: "영수증 촬영",
        mainActionKind: "capture",
      });

    case "station": {
      const station = q || "강남역";
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: [`${station} 도착 정보`],
        mainLabel: "네이버 지하철",
        mainDeeplink: `https://map.naver.com/p/search/${encodeSearch(station)}`,
        auxActions: [
          {
            id: "kakao",
            label: "카카오맵",
            icon: "K",
            deeplink: buildKakaoMapSearchHref(station),
          },
        ],
      });
    }

    case "manual": {
      const catalog = buildMentionManualCatalog(q);
      const total = catalog.reduce((sum, group) => sum + group.rows.length, 0);
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: q,
        summaryLines: q
          ? [`"${q}" 검색 · ${total}개`]
          : ["@ = 앱 단축키 · 눌러서 바로 입력창에 넣기"],
        mainLabel: "",
        mainActionKind: "internal",
        manualCatalog: catalog,
      });
    }

    case "friend_add": {
      const contact = normalizeFriendContactQuery(q);
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: contact,
        summaryLines: contact ? ["프로필 확인 후 친구 추가"] : [],
        mainLabel: "",
        mainActionKind: "internal",
        friendAddContact: contact,
      });
    }

    case "peer_talk": {
      const talkQuery = q.trim();
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: talkQuery,
        summaryLines: talkQuery
          ? ["프로필 확인 후 피드에서 바로 톡"]
          : ["친구 선택 · ROOM과 같은 대화"],
        mainLabel: "",
        mainActionKind: "internal",
        peerTalkQuery: talkQuery,
      });
    }

    case "group_talk": {
      const groupQuery = q.trim();
      return buildInlineChatActionWire({
        featureId: feature.featureId,
        displayName: feature.displayName,
        icon,
        query: groupQuery,
        summaryLines: groupQuery
          ? ["단톡 확인 후 피드에서 바로 대화"]
          : ["단톡 선택 · ROOM과 같은 메시지"],
        mainLabel: "",
        mainActionKind: "internal",
        groupTalkQuery: groupQuery,
      });
    }

    default:
      return null;
  }
}
