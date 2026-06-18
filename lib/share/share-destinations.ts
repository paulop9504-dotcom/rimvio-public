import {
  LINK_CATEGORIES,
  normalizeLinkCategory,
  type LinkCategory,
} from "@/lib/categories/types";
import type { CategoryWeights } from "@/lib/enrichers/types";
import type { LinkRow } from "@/types/database";
import { rimvioBeamUrl } from "@/lib/brand/rimvio";
import { buildBeamShareText } from "@/lib/share/beam-share-text";

export type ShareDestinationId =
  | "native"
  | "sms"
  | "kakao"
  | "github"
  | "slack"
  | "notion"
  | "x"
  | "mail"
  | "copy";

export type ShareLinkInput = Pick<
  LinkRow,
  "title" | "original_url" | "category" | "domain"
> & {
  id?: string;
  share_slug?: string | null;
  expires_at?: string | null;
  actions?: LinkRow["actions"];
  primary_action_label?: string;
};

function destinationShareCopy(link: ShareLinkInput) {
  if (link.share_slug) {
    return buildBeamShareText(link);
  }

  return `${link.title}\n${link.original_url}`;
}

export type ShareDestinationDef = {
  id: ShareDestinationId;
  label: string;
  emoji: string;
  /** Short CTA — e.g. "채팅으로 보내기" */
  verb: string;
  hint: string;
  gradient: string;
  ring: string;
  priority: number;
  categoryBoost: Partial<Record<LinkCategory, number>>;
  buildCopy: (link: ShareLinkInput) => string;
  resolveHref: (link: ShareLinkInput) => { appHref: string | null; webHref: string | null };
};

export const SHARE_DESTINATIONS: ShareDestinationDef[] = [
  {
    id: "native",
    label: "공유",
    emoji: "📤",
    verb: "친구에게 바로 보내기",
    hint: "문자·카톡·인스타 등 골라서",
    gradient: "from-[#007AFF] to-[#0051D5]",
    ring: "ring-[#007AFF]/30",
    priority: -1,
    categoryBoost: Object.fromEntries(
      LINK_CATEGORIES.map((category) => [category, 1])
    ) as Partial<Record<LinkCategory, number>>,
    buildCopy: (link) => destinationShareCopy(link),
    resolveHref: () => ({ appHref: null, webHref: null }),
  },
  {
    id: "sms",
    label: "문자",
    emoji: "💬",
    verb: "문자로 보내기",
    hint: "메시지 앱으로 바로",
    gradient: "from-[#34C759] to-[#248A3D]",
    ring: "ring-[#34C759]/30",
    priority: 0,
    categoryBoost: {
      social: 0.95,
      travel: 0.85,
      uncategorized: 0.9,
      media: 0.75,
      shopping: 0.7,
      research: 0.5,
    },
    buildCopy: (link) => destinationShareCopy(link),
    resolveHref: (link) => {
      const body = encodeURIComponent(destinationShareCopy(link));
      return {
        appHref: `sms:?body=${body}`,
        webHref: `sms:?body=${body}`,
      };
    },
  },
  {
    id: "kakao",
    label: "카카오톡",
    emoji: "💬",
    verb: "채팅으로 보내기",
    hint: "공유 시트 또는 카톡 앱으로 바로",
    gradient: "from-[#FEE500] to-[#F5D300]",
    ring: "ring-[#E6C200]/40",
    priority: 1,
    categoryBoost: {
      media: 1,
      shopping: 0.95,
      travel: 0.9,
      social: 1,
      uncategorized: 0.7,
      research: 0.15,
    },
    buildCopy: (link) => destinationShareCopy(link),
    resolveHref: () => ({
      appHref: "kakaotalk://",
      webHref: null,
    }),
  },
  {
    id: "github",
    label: "GitHub",
    emoji: "🐙",
    verb: "리포에 공유",
    hint: "링크 복사 · GitHub 열기",
    gradient: "from-[#24292f] to-[#1b1f23]",
    ring: "ring-white/15",
    priority: 2,
    categoryBoost: {
      research: 1,
      uncategorized: 0.2,
      media: 0.05,
      shopping: 0.05,
      travel: 0.05,
      social: 0.25,
    },
    buildCopy: (link) => destinationShareCopy(link),
    resolveHref: () => ({
      appHref: "github://",
      webHref: "https://github.com/",
    }),
  },
  {
    id: "slack",
    label: "Slack",
    emoji: "💼",
    verb: "팀에게 공유",
    hint: "복사 후 채널에 붙여넣기",
    gradient: "from-[#611f69] to-[#4A154B]",
    ring: "ring-[#E01E5A]/25",
    priority: 2,
    categoryBoost: {
      research: 0.85,
      social: 0.4,
      uncategorized: 0.25,
      media: 0.1,
      shopping: 0.15,
      travel: 0.1,
    },
    buildCopy: (link) => destinationShareCopy(link),
    resolveHref: () => ({
      appHref: "slack://open",
      webHref: "https://slack.com/signin",
    }),
  },
  {
    id: "notion",
    label: "Notion",
    emoji: "📝",
    verb: "Notion에 붙이기",
    hint: "복사 · Notion 열기",
    gradient: "from-neutral-800 to-neutral-950",
    ring: "ring-white/12",
    priority: 3,
    categoryBoost: {
      research: 0.75,
      shopping: 0.35,
      travel: 0.45,
      media: 0.2,
      social: 0.2,
      uncategorized: 0.3,
    },
    buildCopy: (link) => destinationShareCopy(link),
    resolveHref: () => ({
      appHref: "notion://",
      webHref: "https://www.notion.so/",
    }),
  },
  {
    id: "x",
    label: "X",
    emoji: "🐦",
    verb: "트윗하기",
    hint: "트윗 작성창 열기",
    gradient: "from-neutral-900 to-black",
    ring: "ring-white/10",
    priority: 4,
    categoryBoost: {
      media: 0.8,
      social: 0.85,
      shopping: 0.35,
      travel: 0.25,
      research: 0.2,
      uncategorized: 0.35,
    },
    buildCopy: (link) => destinationShareCopy(link),
    resolveHref: (link) => {
      const text = encodeURIComponent(
        link.share_slug
          ? destinationShareCopy(link).slice(0, 200)
          : link.title.slice(0, 100)
      );
      const url = encodeURIComponent(
        link.share_slug
          ? rimvioBeamUrl(link.share_slug)
          : link.original_url
      );
      return {
        appHref: null,
        webHref: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      };
    },
  },
  {
    id: "mail",
    label: "메일",
    emoji: "✉️",
    verb: "메일로 보내기",
    hint: "메일 앱으로 보내기",
    gradient: "from-[#007AFF] to-[#0051D5]",
    ring: "ring-[#007AFF]/30",
    priority: 5,
    categoryBoost: {
      travel: 0.7,
      research: 0.55,
      shopping: 0.4,
      media: 0.25,
      social: 0.2,
      uncategorized: 0.35,
    },
    buildCopy: (link) => destinationShareCopy(link),
    resolveHref: (link) => {
      const subject = encodeURIComponent(link.title.slice(0, 120));
      const body = encodeURIComponent(destinationShareCopy(link));
      return {
        appHref: null,
        webHref: `mailto:?subject=${subject}&body=${body}`,
      };
    },
  },
  {
    id: "copy",
    label: "링크 복사",
    emoji: "📋",
    verb: "링크만 복사",
    hint: "클립보드에만 저장",
    gradient: "from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800",
    ring: "ring-border/50",
    priority: 6,
    categoryBoost: Object.fromEntries(
      LINK_CATEGORIES.map((category) => [category, 0.35])
    ) as Partial<Record<LinkCategory, number>>,
    buildCopy: (link) => destinationShareCopy(link),
    resolveHref: () => ({ appHref: null, webHref: null }),
  },
];

const DESTINATION_BY_ID = Object.fromEntries(
  SHARE_DESTINATIONS.map((destination) => [destination.id, destination])
) as Record<ShareDestinationId, ShareDestinationDef>;

export function getShareDestination(id: ShareDestinationId) {
  return DESTINATION_BY_ID[id];
}

function scoreDestination(
  destination: ShareDestinationDef,
  category: LinkCategory,
  weights: CategoryWeights | null | undefined,
  link: ShareLinkInput
) {
  let score = destination.categoryBoost[category] ?? 0;
  score += (10 - destination.priority) * 0.01;

  if (destination.id === "native") {
    score += 1.5;
  }

  if (weights) {
    for (const linkCategory of LINK_CATEGORIES) {
      const weight = weights[linkCategory] ?? 0;
      const destBoost = destination.categoryBoost[linkCategory] ?? 0;
      score += weight * destBoost * 0.15;
    }
  }

  if (/github/i.test(link.domain)) {
    if (destination.id === "github") {
      score += 0.2;
    }
  }

  return score;
}

export function rankShareDestinations(
  link: ShareLinkInput,
  options?: { limit?: number; weights?: CategoryWeights | null }
): ShareDestinationDef[] {
  const limit = options?.limit ?? 5;
  const category = normalizeLinkCategory(link.category);

  return [...SHARE_DESTINATIONS]
    .sort((left, right) => {
      const delta =
        scoreDestination(right, category, options?.weights, link) -
        scoreDestination(left, category, options?.weights, link);

      if (Math.abs(delta) > 0.0001) {
        return delta;
      }

      return left.priority - right.priority;
    })
    .slice(0, limit);
}

export type RankedShareDestination = ShareDestinationDef & { rank: number };

export function rankShareDestinationsWithRank(
  link: ShareLinkInput,
  options?: { limit?: number; weights?: CategoryWeights | null }
): RankedShareDestination[] {
  return rankShareDestinations(link, options).map((destination, index) => ({
    ...destination,
    rank: index + 1,
  }));
}
