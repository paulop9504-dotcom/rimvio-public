import { normalizeActionAgentAddress } from "@/lib/action-chat/action-agent-normalize";
import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import {
  buildInlineChatNavigateWire,
} from "@/lib/action-chat/mention-navigate/inline-chat-navigate";
import { resolvePluginDeeplink } from "@/lib/action-spawn/resolve-plugin-deeplink";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";
import {
  buildKakaoMapSearchHref,
  buildNaverMapSearchHref,
} from "@/lib/resolvers/deep-links";

const NAV_MENTION =
  /^@(네비|네비게이션|길찾기|navigate|nav|길)(?:\s+(.*))?$/iu;

function createChatMessage(
  role: ActionChatMessage["role"],
  text: string,
  extra?: Partial<ActionChatMessage>,
): ActionChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

export function parseMentionNavigateInput(raw: string): { query: string } | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(NAV_MENTION);
  if (!match) {
    return null;
  }
  return { query: (match[2] ?? "").trim() };
}

export function isMentionNavigateInput(text: string): boolean {
  return parseMentionNavigateInput(text) !== null;
}

export function resolveMentionNavigateDestination(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const place = resolveNavigationPlaceName(trimmed);
  if (place) {
    return place;
  }

  const address = normalizeActionAgentAddress(trimmed);
  if (address) {
    return address.replace(/\s*까지\s*$/u, "").trim() || address;
  }

  return null;
}

export function buildMentionNavigateWire(destination: string) {
  const mainDeeplink = buildKakaoMapSearchHref(destination);
  const naverDeeplink = buildNaverMapSearchHref(destination);
  const taxiDeeplink =
    resolvePluginDeeplink("kakao.taxi", { destination, label: destination }) ??
    `https://taxi.kakao.com/?dest=${encodeURIComponent(destination)}`;

  return buildInlineChatNavigateWire({
    destination,
    mainLabel: "카카오맵",
    mainDeeplink,
    auxActions: [
      {
        id: "naver",
        label: "네이버",
        icon: "N",
        deeplink: naverDeeplink,
      },
      {
        id: "taxi",
        label: "카카오T",
        icon: "T",
        deeplink: taxiDeeplink,
      },
    ],
  });
}

/** Local @네비 turn — nav deeplink chip, no orchestrator. */
export function tryBuildMentionNavigateTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
}): ActionChatMessage[] | null {
  const parsed = parseMentionNavigateInput(input.text);
  if (!parsed) {
    return null;
  }

  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });

  if (!parsed.query) {
    return [
      userMessage,
      createChatMessage(
        "assistant",
        "어디로 길찾기 할까요? 예: @네비 강남역, @네비 서울시 강남구 테헤란로",
      ),
    ];
  }

  const destination = resolveMentionNavigateDestination(parsed.query);
  if (!destination) {
    return [
      userMessage,
      createChatMessage(
        "assistant",
        "목적지를 찾지 못했어요. 역·주소·장소 이름을 다시 적어 주세요.",
      ),
    ];
  }

  return [
    userMessage,
    createChatMessage("assistant", "", {
      inlineChatNavigate: buildMentionNavigateWire(destination),
      metadata: mentionOrchestratorMetadata({
        mention_feature: "navigate",
        sourceRef: "mention:navigate",
      }),
    }),
  ];
}
