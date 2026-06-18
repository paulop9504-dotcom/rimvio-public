import {
  deriveCalendarSlotHeadline,
  deriveCalendarSlotContext,
} from "@/lib/feed/build-feed-today-slots";
import {
  deriveFeedSlotContext,
  deriveFeedSlotHeadline,
} from "@/lib/feed/derive-feed-slot-display";
import type { FeedSlotPill } from "@/lib/feed/feed-slot-pill-types";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import {
  buildKakaoMapSearchHref,
  buildKakaoMapSearchWebHref,
} from "@/lib/resolvers/deep-links";

function trimPlaceParticle(label: string): string {
  return label.replace(/(?:에서|으로|에)$/u, "").trim();
}

const PLACE_PATTERNS = [
  /스타벅스/u,
  /(?:[가-힣]{2,10}동)\s*\d*/iu,
  /(?:[가-힣]{2,10}역)/iu,
  /(?:카페|식당|맛집|호텔|공항)[^\s,.]*/iu,
] as const;

const FEED_LATER_DEEPLINK = "rimvio://feed/later" as const;

function collectSlotText(slot: FeedTodaySlot): string {
  if (slot.kind === "surface") {
    const loc = slot.surface.resources.find((row) => row.kind === "location")?.label;
    return [loc, deriveFeedSlotHeadline(slot.surface), deriveFeedSlotContext(slot.surface), slot.surface.title]
      .filter(Boolean)
      .join(" ");
  }

  const row = slot.row;
  return [
    row.event.entry?.placeName,
    row.prompt_hint,
    row.context_lines?.join(" "),
    deriveCalendarSlotHeadline(row),
    deriveCalendarSlotContext(row),
    row.event.title,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Place / venue string for map search deeplink. */
export function resolveFeedSlotNavigateQuery(slot: FeedTodaySlot): string | null {
  const blob = collectSlotText(slot).trim();
  if (!blob) {
    return null;
  }

  for (const pattern of PLACE_PATTERNS) {
    const match = blob.match(pattern);
    if (match?.[0]) {
      return trimPlaceParticle(match[0].trim());
    }
  }

  const venue = blob.match(/(?:에서|에)\s+([가-힣a-zA-Z0-9][^\s,.]{1,20})/u);
  if (venue?.[1]) {
    return trimPlaceParticle(venue[1].trim());
  }

  const compact = blob.replace(/\s+/g, " ").trim();
  if (compact.length >= 3 && compact.length <= 36) {
    return compact;
  }

  return compact.slice(0, 32) || null;
}

/** Standard feed pills — 길찾기 · 나중에 (연락은 프로필 칩 → ROOM). */
export function resolveFeedSlotPills(slot: FeedTodaySlot): FeedSlotPill[] {
  const pills: FeedSlotPill[] = [];
  const query = resolveFeedSlotNavigateQuery(slot);

  if (query) {
    pills.push({
      kind: "deeplink",
      id: `${slot.id}:navigate`,
      label: "길찾기",
      deeplink: buildKakaoMapSearchHref(query),
      fallbackDeeplink: buildKakaoMapSearchWebHref(query),
    });
  }

  if (slot.kind === "surface") {
    pills.push({
      kind: "capability",
      id: `${slot.id}:later`,
      label: "나중에",
      capabilityId: "DISMISS_SURFACE",
    });
  } else {
    pills.push({
      kind: "deeplink",
      id: `${slot.id}:later`,
      label: "나중에",
      deeplink: FEED_LATER_DEEPLINK,
    });
  }

  return pills.slice(0, 2);
}
