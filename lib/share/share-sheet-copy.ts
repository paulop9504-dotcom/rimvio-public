import type { LinkCategory } from "@/lib/categories/types";
import { normalizeLinkCategory } from "@/lib/categories/types";
import type { ShareLinkInput } from "@/lib/share/share-destinations";
import { getShareUrgencyLine } from "@/lib/share/share-urgency";

type ShareSheetCopy = {
  headline: string;
  subline: string;
  emoji: string;
  urgency: string | null;
};

const COPY_BY_CATEGORY: Record<LinkCategory, Omit<ShareSheetCopy, "urgency">> = {
  media: {
    headline: "링크 말고, 바로 재생해 보세요",
    subline: "받는 분도 탭 한 번이면 됩니다",
    emoji: "🎬",
  },
  shopping: {
    headline: "이걸로 보내 보세요",
    subline: "품절 전에 함께 확인해 보세요",
    emoji: "🛒",
  },
  travel: {
    headline: "함께 가실 분이 계신가요?",
    subline: "지도와 숙소가 한 번에 열립니다",
    emoji: "✈️",
  },
  research: {
    headline: "팀에게 이렇게 전해 보세요",
    subline: "주소를 찾을 필요 없이 바로 열립니다",
    emoji: "🔍",
  },
  social: {
    headline: "한번 해 보실래요?",
    subline: "탭 한 번이면 바로 열립니다",
    emoji: "💬",
  },
  uncategorized: {
    headline: "받는 순간, 바로 열립니다",
    subline: "주소를 찾을 필요 없어요",
    emoji: "👀",
  },
};

export function getShareSheetCopy(link: ShareLinkInput): ShareSheetCopy {
  const base = COPY_BY_CATEGORY[normalizeLinkCategory(link.category)];
  const urgency = getShareUrgencyLine(link);

  return {
    ...base,
    urgency,
    subline: urgency ? `${base.subline} · ${urgency}` : base.subline,
  };
}

export { getShareUrgencyLine } from "@/lib/share/share-urgency";

export function getRankMicrocopy(rank: number): string | null {
  if (rank === 1) {
    return "지금 가장 잘 맞습니다";
  }

  if (rank === 2) {
    return "이것도 괜찮습니다";
  }

  if (rank === 3) {
    return "한번 더 살펴보기 좋습니다";
  }

  return null;
}

export function getShareToastMessage(
  label: string,
  copied: boolean,
  opened: boolean
): { title: string; description: string } {
  if (copied && opened) {
    return {
      title: `${label}(으)로 보냈습니다`,
      description: "붙여넣기만 하면 바로 열 수 있습니다",
    };
  }

  if (copied) {
    return {
      title: "공유 문구를 복사했습니다",
      description: `${label}에 붙여넣어 주세요`,
    };
  }

  return {
    title: "잠시만요",
    description: "다시 한번 눌러 보시겠어요?",
  };
}
