import { extractPlaceEntities, stripUiNoise } from "@/lib/action-chat/clean-entity-text";
import { readNavAddress } from "@/lib/action-chat/normalize-address";
import {
  resolveNavigationPlaceName,
  sanitizePlaceNameForNavigation,
} from "@/lib/action-chat/resolve-navigation-place";
import type { DecomposedIntent } from "@/lib/action-chat/decomposition-types";

/**
 * Scope-limited place label — only ever pass a decomposed fragment, never the full user message.
 */
export function getPlaceFromFragment(fragment: string): string | null {
  const cleaned = stripUiNoise(fragment.trim());
  if (!cleaned) {
    return null;
  }

  const resolved = resolveNavigationPlaceName(cleaned);
  if (resolved) {
    return resolved;
  }

  const info = extractPlaceEntities(cleaned);
  const entityLabel = [info.name, info.branch].filter(Boolean).join(" ").trim() || null;
  return sanitizePlaceNameForNavigation(entityLabel, cleaned);
}

export function getAddressFromFragment(fragment: string): string | null {
  const cleaned = stripUiNoise(fragment.trim());
  if (!cleaned) {
    return null;
  }

  return readNavAddress(extractPlaceEntities(cleaned).address) ?? null;
}

export function getIntentFromFragment(fragment: string): DecomposedIntent {
  const text = fragment.trim();
  if (!text) {
    return "TASK";
  }

  if (/택시|우버|카카오\s*t|호출/i.test(text)) {
    return "MOBILITY";
  }
  if (/토스|송금|이체|카카오\s*페이|결제/i.test(text)) {
    return "FINANCE";
  }
  if (/문자|전화|카톡|톡\s*방/i.test(text)) {
    return "COMMUNICATION";
  }
  if (/배송|택배|쿠팡\s*주문/i.test(text)) {
    return "SHOPPING";
  }
  if (/스포티파이|유튜브|플레이\s*리스트/i.test(text)) {
    return "MEDIA";
  }
  if (/예약|부킹|booking/i.test(text)) {
    return "RESERVATION";
  }
  if (/쇼핑|장보기|구매|쇼핑몰/i.test(text)) {
    return "SHOPPING";
  }
  if (/가야|길찾기|네비|출발|이동|도착|역\b|공항|터미널/i.test(text)) {
    return "NAVIGATION";
  }
  if (/일정|약속|미팅|회의|알람|리마인드/i.test(text)) {
    return "SCHEDULE";
  }

  return "TASK";
}

export function getDetailsFromFragment(fragment: string, intent: DecomposedIntent): string {
  const cleaned = stripUiNoise(fragment.trim());
  if (!cleaned) {
    return "";
  }

  if (intent === "SHOPPING") {
    return cleaned.match(/쇼핑[^,.]*|장보기[^,.]*/)?.[0]?.trim() ?? "쇼핑";
  }
  if (intent === "RESERVATION") {
    return cleaned.match(/(?:\d{1,2}\s*시[^,.]*|예약[^,.]*)/)?.[0]?.trim() ?? cleaned.slice(0, 32);
  }
  if (intent === "NAVIGATION") {
    const place = getPlaceFromFragment(cleaned);
    return place ? `${place} 이동` : cleaned.slice(0, 32);
  }

  return cleaned.slice(0, 40);
}
