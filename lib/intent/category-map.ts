import type { ScreenshotIntentKind } from "@/lib/screenshot/classify-intent";
import type { KernelCategory, TrajectoryCluster } from "@/lib/intent/kernel-types";
import type { ActionFamily } from "@/lib/personalization/types";

const TECH_TITLE =
  /iphone|아이폰|galaxy|갤럭시|macbook|맥북|gpu|keyboard|키보드|monitor|모니터|sony|playstation|switch|ipad|노트북|laptop|wh-|xm\d/i;

const FOOD_TITLE =
  /맛집|카페|restaurant|cafe|배달|치킨|피자|ramen|라면|food|menu|식당/i;

const FASHION_TITLE =
  /옷|fashion|나이키|nike|adidas|무신사|패션|코트|jacket|shoes|신발|bag|가방/i;

const MEDIA_DOMAIN =
  /youtube|youtu\.be|instagram|tiktok|netflix|twitch|vimeo|spotify/i;

export function mapScreenshotKindToKernelCategory(input: {
  kind?: ScreenshotIntentKind | null;
  domain?: string | null;
  category?: string | null;
  title?: string | null;
  query?: string | null;
}): KernelCategory {
  if (input.kind === "place" || input.kind === "address" || input.kind === "travel_booking") {
    return "place";
  }

  if (input.kind === "menu_food") {
    return "place";
  }

  if (input.kind === "url") {
    const domain = input.domain ?? "";
    if (MEDIA_DOMAIN.test(domain) || input.category === "video") {
      return "media";
    }
    if (input.category === "travel" || /map|naver\.me|kakaomap/i.test(domain)) {
      return "place";
    }
    if (input.category === "shopping" || /joongna|bunjang|coupang|amazon/i.test(domain)) {
      return "commerce";
    }
    if (input.category === "news" || input.category === "article") {
      return "media";
    }
    return "productivity";
  }

  if (input.kind === "product" || input.kind === "receipt") {
    return "commerce";
  }

  return "unknown";
}

export function mapSaveToTrajectoryCluster(input: {
  category?: string | null;
  domain?: string | null;
  title?: string | null;
}): TrajectoryCluster {
  const title = `${input.title ?? ""} ${input.domain ?? ""}`;
  const category = (input.category ?? "").toLowerCase();

  if (category === "travel" || /map|hotel|booking|airbnb/i.test(title)) {
    return "travel";
  }

  if (category === "video" || category === "news" || MEDIA_DOMAIN.test(title)) {
    return "media";
  }

  if (FOOD_TITLE.test(title) || category === "food") {
    return "food";
  }

  if (TECH_TITLE.test(title)) {
    return "tech";
  }

  if (FASHION_TITLE.test(title) || category === "shopping") {
    return "fashion";
  }

  if (/bank|finance|stock|invest|카드|증권|pay/i.test(title)) {
    return "finance";
  }

  if (/notion|github|docs|productivity|todo|calendar/i.test(title)) {
    return "productivity";
  }

  return "unknown";
}

export function primaryActionFamilyForKernel(input: {
  kernelCategory: KernelCategory;
  band: import("@/lib/screenshot/transition-gate").ConfidenceBand;
  crossLinkPattern: import("@/lib/intent/kernel-types").CrossLinkPattern;
}): ActionFamily {
  if (input.band === "uncertain") {
    return "save_open";
  }

  if (input.crossLinkPattern === "comparison" || input.kernelCategory === "commerce") {
    return "price_compare";
  }

  if (input.kernelCategory === "place") {
    return "map_navigate";
  }

  if (input.kernelCategory === "media") {
    return "save_open";
  }

  return "save_open";
}
