import type { LinkActionItem } from "@/types/database";
import type { ActionFamily, DomainFamily } from "@/lib/personalization/types";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";

const PRICE_COMPARE =
  /다나와|최저|가격.?알림|price.?alert|danawa|shopping\.naver|네이버.?쇼핑.?비교/i;
const REVIEW_DECIDE = /리뷰|후기|반박|비교|vs|장단점|review|real.?review/i;
const SUMMARY_READ = /요약|읽기|summary|핵심|sparkles|chatgpt|perplexity/i;
const MAP_NAV = /지도|map|길찾|navi|kakaomap|nmap|navigate/i;
const SHARE_REMIND = /공유|리마인|할.?일|remind|calendar|캘린더/i;
const CONTACT_CALL = /전화|tel:|dm|연락|vcard|바로.?전화/i;
const DONE_CLOSE = /완료|done|체크/i;

export function toActionFamily(action: LinkActionItem): ActionFamily {
  const label = action.label ?? "";
  const href = action.href ?? "";
  const haystack = `${label} ${href}`;

  if (action.kind === "copy") {
    return "copy_clip";
  }

  if (action.payload?.blinkAction === "done" || DONE_CLOSE.test(label)) {
    return "done_close";
  }

  if (PRICE_COMPARE.test(haystack)) {
    return "price_compare";
  }

  if (REVIEW_DECIDE.test(haystack)) {
    return "review_decide";
  }

  if (SUMMARY_READ.test(haystack)) {
    return "summary_read";
  }

  if (MAP_NAV.test(haystack) || action.payload?.icon === "map") {
    return "map_navigate";
  }

  if (CONTACT_CALL.test(haystack)) {
    return "contact_call";
  }

  if (SHARE_REMIND.test(haystack) || action.kind === "remind" || action.kind === "share") {
    return "share_remind";
  }

  if (action.kind === "open") {
    return "save_open";
  }

  return "save_open";
}

export function toDomainFamily(
  domain: string,
  category?: string | null
): DomainFamily {
  const normalized = domain.toLowerCase().replace(/^www\./, "");
  const cat = category?.toLowerCase() ?? "";

  if (/joongna|junggo|bunjang|daangn|karrot/i.test(normalized)) {
    return "secondhand";
  }

  if (isCommerceDomain(normalized) || cat === "shopping") {
    return "commerce";
  }

  if (/news|yna|chosun|joongang|donga|hani|mk\.|hankyung|techcrunch|reuters/i.test(normalized)) {
    return "news";
  }

  if (/map\.|place\.|kakao\.com\/local|google\.com\/maps/i.test(normalized) || cat === "travel") {
    return "map";
  }

  if (/youtube|youtu\.be|netflix|tving|spotify|twitch/i.test(normalized) || cat === "media") {
    return "media";
  }

  if (/instagram|twitter|x\.com|facebook|tiktok|blog\.naver|cafe\.naver/i.test(normalized) || cat === "social") {
    return "social";
  }

  return "generic";
}

export function nextLifecycleState(
  current: import("@/lib/personalization/types").LinkLifecycleState,
  actionFamily: ActionFamily
): import("@/lib/personalization/types").LinkLifecycleState {
  if (actionFamily === "done_close") {
    return "done";
  }

  if (actionFamily === "price_compare") {
    return "compared";
  }

  if (actionFamily === "review_decide" || actionFamily === "summary_read") {
    if (current === "opened" || current === "compared") {
      return "decided";
    }
  }

  if (actionFamily === "save_open" && current === "saved") {
    return "opened";
  }

  return current;
}
