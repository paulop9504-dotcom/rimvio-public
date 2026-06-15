import { getCopy, getUiLocale } from "@/lib/i18n/get-copy";
import { readStoredLocale } from "@/lib/i18n/locale-store";
import { toast } from "sonner";

function clientCopy() {
  const stored = readStoredLocale();
  return getCopy(getUiLocale(stored ?? "ko"));
}

/** 피드 @톡 → 친구 ROOM 이동 시 한 줄 안내 */
export function notifyPeerRoomFromFeed(displayName?: string | null): void {
  const copy = clientCopy();
  const name = displayName?.trim();
  toast.message(
    name
      ? `${name} · ${copy.product.feedPeerTalkRoomHint}`
      : copy.product.feedPeerTalkStartedToast,
    {
      description: copy.product.lensCoachSub,
      duration: 4200,
    },
  );
}

/** @톡 대화 시작 직후 — ROOM 안내 */
export function notifyFeedPeerTalkStarted(displayName: string): void {
  const copy = clientCopy();
  toast.message(copy.product.feedPeerTalkStartedToast, {
    description: `${displayName} · ${copy.product.feedPeerTalkRoomHint}`,
    duration: 5000,
  });
}

export function peerRoomPath(peerThreadId: string): string {
  return `/peers/${encodeURIComponent(peerThreadId)}`;
}
