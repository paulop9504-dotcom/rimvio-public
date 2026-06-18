import { resolveLinkBrand } from "@/lib/feed/link-brand-art";
import type { LinkActionItem, LinkRow } from "@/types/database";

export function resolveActionHint(
  action: LinkActionItem,
  link: Pick<LinkRow, "domain" | "original_url" | "category">
): string | null {
  if (action.kind !== "open" || !action.href) {
    return null;
  }

  const href = action.href.toLowerCase();
  const brand = resolveLinkBrand(link).displayName;

  if (href.startsWith("coupang://") || link.domain.includes("coupang")) {
    return "쿠팡 앱에서 열기";
  }

  if (href.includes("kakaomap") || href.includes("kakao.com/map")) {
    return "카카오맵 앱에서 열기";
  }

  if (href.includes("nmap://") || href.includes("map.naver")) {
    return "네이버 지도에서 열기";
  }

  if (href.includes("youtube.com") || link.domain.includes("youtube")) {
    return "YouTube에서 재생";
  }

  if (href.startsWith("tel:") || href.startsWith("telprompt:")) {
    return "전화 앱 키패드로 연결";
  }

  if (action.payload?.icon === "external-link") {
    return `${brand} 페이지에서 열기`;
  }

  if (href.startsWith("http")) {
    return `${brand}에서 열기`;
  }

  return null;
}
