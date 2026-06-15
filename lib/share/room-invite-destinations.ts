import { RIMVIO } from "@/lib/brand/rimvio";
import { buildRoomInviteText } from "@/lib/share/beam-share-text";
import { buildRoomUrl } from "@/lib/share/beam-url";
import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import { triggerActionHaptic } from "@/lib/action-shadowing";
import type { ShareDestinationDef } from "@/lib/share/share-destinations";
import type { RoomRow } from "@/lib/rooms/types";

export const ROOM_INVITE_DESTINATIONS: ShareDestinationDef[] = [
  {
    id: "kakao",
    label: "카카오톡",
    emoji: "💬",
    verb: "초대장 보내기",
    hint: "복사 후 채팅에 붙여넣기",
    gradient: "from-[#FEE500] to-[#F5D300]",
    ring: "ring-[#E6C200]/40",
    priority: 0,
    categoryBoost: {},
    buildCopy: () => "",
    resolveHref: () => ({
      appHref: "kakaotalk://",
      webHref: null,
    }),
  },
  {
    id: "copy",
    label: "링크 복사",
    emoji: "🔗",
    verb: "초대 링크 복사",
    hint: "붙여넣기만 하면 들어와요",
    gradient: "from-violet-500 to-fuchsia-600",
    ring: "ring-violet-400/35",
    priority: 1,
    categoryBoost: {},
    buildCopy: () => "",
    resolveHref: () => ({ appHref: null, webHref: null }),
  },
  {
    id: "mail",
    label: "메일",
    emoji: "✉️",
    verb: "메일로 초대",
    hint: "메일 앱으로 보내기",
    gradient: "from-[#007AFF] to-[#0051D5]",
    ring: "ring-[#007AFF]/30",
    priority: 2,
    categoryBoost: {},
    buildCopy: () => "",
    resolveHref: () => ({ appHref: null, webHref: null }),
  },
  {
    id: "x",
    label: "X",
    emoji: "🐦",
    verb: "트윗으로 초대",
    hint: "트윗 작성창 열기",
    gradient: "from-neutral-900 to-black",
    ring: "ring-white/10",
    priority: 3,
    categoryBoost: {},
    buildCopy: () => "",
    resolveHref: () => ({ appHref: null, webHref: null }),
  },
];

export type RankedRoomInviteDestination = ShareDestinationDef & { rank: number };

export function rankRoomInviteDestinations(): RankedRoomInviteDestination[] {
  return ROOM_INVITE_DESTINATIONS.slice(0, 4).map((destination, index) => ({
    ...destination,
    rank: index + 1,
  }));
}

export function roomInviteCopy(room: RoomRow) {
  return buildRoomInviteText(room.name, buildRoomUrl(room.slug));
}

export async function runRoomInviteDestination(
  destination: ShareDestinationDef,
  room: RoomRow
): Promise<{ copiedText: string | null; opened: boolean }> {
  triggerActionHaptic();

  const copyText = roomInviteCopy(room);
  let copiedText: string | null = null;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(copyText);
      copiedText = copyText;
    } catch {
      copiedText = null;
    }
  }

  let opened = false;

  if (destination.id === "mail") {
    const subject = encodeURIComponent(`${room.name} — 함께방 초대`);
    const body = encodeURIComponent(copyText);
    window.location.assign(`mailto:?subject=${subject}&body=${body}`);
    opened = true;
  } else if (destination.id === "x") {
    const text = encodeURIComponent(copyText.slice(0, 200));
    window.location.assign(`https://twitter.com/intent/tweet?text=${text}`);
    opened = true;
  } else {
    const { appHref, webHref } = destination.resolveHref({
      title: room.name,
      original_url: buildRoomUrl(room.slug),
      category: null,
      domain: RIMVIO.domain,
    });

    if (appHref || webHref) {
      if (appHref) {
        openHrefWithFallback(appHref, webHref);
        opened = true;
      } else if (webHref) {
        window.location.assign(webHref);
        opened = true;
      }
    }
  }

  return { copiedText, opened };
}

export async function runRoomSystemShare(room: RoomRow) {
  triggerActionHaptic();
  const copyText = roomInviteCopy(room);
  const url = buildRoomUrl(room.slug);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `${room.name} 초대`,
        text: copyText,
        url,
      });
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function getRoomInviteToastMessage(
  label: string,
  copied: boolean,
  opened: boolean
): { title: string; description: string } {
  if (copied && opened) {
    return {
      title: `${label}로 초대 보냈어요`,
      description: "붙여넣기만 하면 바로 들어와요",
    };
  }

  if (copied) {
    return {
      title: "초대 링크 복사했어요",
      description: `${label}에 붙여넣기 해 주세요`,
    };
  }

  return {
    title: label,
    description: "잠시 후 다시 시도해 주세요",
  };
}
