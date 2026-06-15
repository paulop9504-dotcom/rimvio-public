import type { ScheduleConfirmDraft } from "@/lib/peer-chat/ai-lens/prepare-schedule-confirm";
import {
  isScheduleLensAction,
  prepareScheduleConfirmDraft,
} from "@/lib/peer-chat/ai-lens/prepare-schedule-confirm";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { recordLensBubbleClick } from "@/lib/peer-chat/ai-lens/lens-user-history";
import {
  openMapProvider,
  preferredMapProvider,
} from "@/lib/peer-chat/ai-lens/open-map-navigation";

export type LensBubbleExecuteResult = {
  ok: boolean;
  message: string;
  /** UI opens map picker — no auto navigation. */
  openMapPicker?: { place: string };
  /** UI opens schedule confirm sheet — no auto save. */
  openScheduleConfirm?: ScheduleConfirmDraft;
};

/** User tap only — never called without explicit click. */
export function executeDeepLinkBubbleCandidate(
  candidate: DeepLinkBubbleCandidate,
  input?: {
    sourceMessageId?: string;
    peerDisplayName?: string;
    peerThreadId?: string;
  },
): LensBubbleExecuteResult {
  if (isScheduleLensAction(candidate.actionType)) {
    return {
      ok: true,
      message: "",
      openScheduleConfirm: prepareScheduleConfirmDraft({
        candidate,
        sourceMessageId: input?.sourceMessageId,
        peerDisplayName: input?.peerDisplayName,
        peerThreadId: input?.peerThreadId,
      }),
    };
  }

  recordLensBubbleClick(candidate.actionType);

  switch (candidate.actionType) {
    case "navigate": {
      const place = candidate.payload?.place?.trim();
      if (!place) {
        return { ok: false, message: "장소를 찾지 못했어요" };
      }
      if (typeof window !== "undefined") {
        openMapProvider(place, preferredMapProvider());
      }
      return {
        ok: true,
        message: `${place} · 길찾기`,
      };
    }

    case "transfer":
      return {
        ok: true,
        message: "송금은 뱅킹 앱에서 직접 확인해 주세요 (자동 송금 안 함)",
      };

    case "save_resource": {
      const url = candidate.payload?.url;
      if (!url) {
        return { ok: false, message: "링크가 없어요" };
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("rimvio:share-link", { detail: { url } }),
        );
      }
      return { ok: true, message: "링크를 피드에 저장할 수 있어요" };
    }

    case "open_link": {
      const url = candidate.payload?.url ?? candidate.deepLink;
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return { ok: true, message: "링크를 열었어요" };
    }

    default:
      return { ok: false, message: "지원하지 않는 액션이에요" };
  }
}
