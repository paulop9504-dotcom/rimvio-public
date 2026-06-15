import { normalizeLinkCategory, type LinkCategory } from "@/lib/categories/types";
import { pickFoggPrimaryAction, scoreActionEffort } from "@/lib/behavior/fogg";
import { filterFeedDisplayActions } from "@/lib/feed/feed-action-filter";
import type { LinkActionItem, LinkRow } from "@/types/database";

export type RoomPhaseMode =
  | "map"
  | "commerce"
  | "travel"
  | "media"
  | "social"
  | "research";

export type RoomPhaseState = {
  bins: Partial<Record<RoomPhaseMode, number>>;
  updated_at: string;
};

export type DominantRoomPhase = {
  mode: RoomPhaseMode;
  strength: number;
  total: number;
};

export const ROOM_PHASE_MODES: RoomPhaseMode[] = [
  "map",
  "commerce",
  "travel",
  "media",
  "social",
  "research",
];

export const ROOM_PHASE_COUPLING = 0.12;
export const ROOM_PHASE_MIN_PULSES = 2;
export const ROOM_PHASE_TTL_MS = 45 * 60 * 1000;

export function emptyRoomPhaseBins(): Record<RoomPhaseMode, number> {
  return {
    map: 0,
    commerce: 0,
    travel: 0,
    media: 0,
    social: 0,
    research: 0,
  };
}

export function createEmptyRoomPhase(): RoomPhaseState {
  return {
    bins: emptyRoomPhaseBins(),
    updated_at: new Date().toISOString(),
  };
}

export function detectRoomPhaseFromAction(
  action: LinkActionItem
): RoomPhaseMode | null {
  const text = `${action.label} ${action.href ?? ""} ${
    action.payload?.icon ?? ""
  } ${action.payload?.blinkAction ?? ""}`.toLowerCase();

  if (/nmap:|kakaomap|지도|map|길찾기|navigate|place|🗺|📍|🚗|🚶|🚌/.test(text)) {
    return "map";
  }

  if (
    /쇼핑|가격|최저|commerce|shop|coupang|danawa|musinsa|gmarket|🛒|🔔.*가격|price/.test(
      text
    )
  ) {
    return "commerce";
  }

  if (/예약|booking|hotel|항공|여행|flight|숙소|yanolja|airbnb|🏨|📅/.test(text)) {
    return "travel";
  }

  if (/youtube|재생|play|netflix|ott|영상|tving|▶|🎬|📺/.test(text)) {
    return "media";
  }

  if (/카톡|공유|share|dm|문의|전화|tel:|친구|💬|📞|kakao/.test(text)) {
    return "social";
  }

  if (/chatgpt|perplexity|요약|검색|search|sparkles|✨|🤖|📖/.test(text)) {
    return "research";
  }

  return null;
}

export function recordRoomPhasePulse(
  phase: RoomPhaseState | null | undefined,
  action: LinkActionItem,
  weight = 2
): RoomPhaseState {
  const mode = detectRoomPhaseFromAction(action);
  const next = createEmptyRoomPhase();

  for (const key of ROOM_PHASE_MODES) {
    next.bins[key] = phase?.bins?.[key] ?? 0;
  }

  if (mode) {
    next.bins[mode] = (next.bins[mode] ?? 0) + weight;
  }

  next.updated_at = new Date().toISOString();
  return next;
}

export function isRoomPhaseFresh(phase: RoomPhaseState | null | undefined) {
  if (!phase?.updated_at) {
    return false;
  }

  return Date.now() - new Date(phase.updated_at).getTime() < ROOM_PHASE_TTL_MS;
}

export function resolveDominantRoomPhase(
  phase: RoomPhaseState | null | undefined
): DominantRoomPhase | null {
  if (!phase?.bins || !isRoomPhaseFresh(phase)) {
    return null;
  }

  const entries = ROOM_PHASE_MODES.map(
    (mode) => [mode, phase.bins[mode] ?? 0] as const
  );
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total < ROOM_PHASE_MIN_PULSES) {
    return null;
  }

  const [mode, count] = [...entries].sort((left, right) => right[1] - left[1])[0];

  if (count <= 0) {
    return null;
  }

  return {
    mode,
    strength: count / total,
    total,
  };
}

const PHASE_CATEGORY_ALIGN: Record<RoomPhaseMode, LinkCategory[]> = {
  map: ["travel", "uncategorized"],
  commerce: ["shopping", "uncategorized"],
  travel: ["travel", "uncategorized"],
  media: ["media", "uncategorized"],
  social: ["social", "uncategorized"],
  research: ["research", "uncategorized"],
};

export function linkAlignsWithRoomPhase(
  link: Pick<LinkRow, "category">,
  mode: RoomPhaseMode
) {
  const category = normalizeLinkCategory(link.category);
  return PHASE_CATEGORY_ALIGN[mode].includes(category);
}

export function pickRoomPrimaryAction(
  actions: LinkActionItem[],
  phase: RoomPhaseState | null | undefined,
  link: Pick<LinkRow, "category">
): LinkActionItem | null {
  const displayActions = filterFeedDisplayActions(actions);

  if (displayActions.length === 0) {
    return actions[0] ?? null;
  }

  const dominant = resolveDominantRoomPhase(phase);

  if (!dominant || !linkAlignsWithRoomPhase(link, dominant.mode)) {
    return pickFoggPrimaryAction(displayActions) ?? displayActions[0];
  }

  const boost = ROOM_PHASE_COUPLING * 10;

  const ranked = [...displayActions].sort((left, right) => {
    const leftScore = scoreActionEffort(left);
    const rightScore = scoreActionEffort(right);
    const leftPhase = detectRoomPhaseFromAction(left);
    const rightPhase = detectRoomPhaseFromAction(right);
    const leftAdjusted =
      leftScore - (leftPhase === dominant.mode ? boost : 0);
    const rightAdjusted =
      rightScore - (rightPhase === dominant.mode ? boost : 0);

    return leftAdjusted - rightAdjusted;
  });

  return ranked[0] ?? displayActions[0];
}

export function roomPhaseHintKey(mode: RoomPhaseMode) {
  return mode;
}
