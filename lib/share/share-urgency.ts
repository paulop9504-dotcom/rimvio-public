import type { ShareLinkInput } from "@/lib/share/share-destinations";

export function getShareUrgencyLine(link: Pick<ShareLinkInput, "expires_at">) {
  if (!link.expires_at) {
    return null;
  }

  const expiresAt = new Date(link.expires_at).getTime();
  const remainingMs = expiresAt - Date.now();

  if (remainingMs <= 0) {
    return "⏰ 슬슬 늦었어요 — 지금 눌러야 해요";
  }

  const hours = Math.ceil(remainingMs / (60 * 60 * 1000));

  if (hours <= 1) {
    return "⏰ 1시간 안에 안 하면 놓칠 수도 있어요";
  }

  if (hours <= 24) {
    return `⏰ ${hours}시간 정도 여유 있어요 — 오늘 안에 해봐요`;
  }

  return null;
}
