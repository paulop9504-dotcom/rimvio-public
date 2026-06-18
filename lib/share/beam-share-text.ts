import { buildBeamUrl } from "@/lib/share/beam-url";
import { getShareUrgencyLine } from "@/lib/share/share-sheet-copy";
import type { ShareLinkInput } from "@/lib/share/share-destinations";

export function buildBeamShareText(link: ShareLinkInput) {
  const actionLabel = link.primary_action_label ?? "바로 열기";
  const beamUrl = link.share_slug ? buildBeamUrl(link.share_slug) : link.original_url;
  const urgency = getShareUrgencyLine(link);

  const lines = [
    "주소를 찾을 필요 없어요 — 탭 한 번이면 바로 열립니다.",
    `▶ ${actionLabel}`,
    link.title,
    beamUrl,
  ];

  if (urgency) {
    lines.splice(1, 0, urgency);
  }

  return lines.filter(Boolean).join("\n");
}

export function buildRoomInviteText(roomName: string, roomUrl: string) {
  return [
    "함께해 보실래요? 여기로 들어와 주세요",
    roomName,
    roomUrl,
  ].join("\n");
}
