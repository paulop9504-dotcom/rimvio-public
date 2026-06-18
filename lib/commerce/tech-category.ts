import { buildCompareQuery } from "@/lib/commerce/compare-query";

export type TechDeviceKind =
  | "apple_phone"
  | "apple_tablet"
  | "apple_laptop"
  | "samsung_phone"
  | "samsung_tablet"
  | "generic_tech";

const TECH_TITLE_PATTERN =
  /아이폰|iphone|아이패드|ipad|맥북|macbook|\bmac\b|갤럭시|galaxy|galaxy\s*(tab|z|s|a|note)|삼성\s*탭|galaxy\s*book|애플\s*워치|apple\s*watch|에어팟|airpods|갤럭시\s*버즈|galaxy\s*buds|nintendo|switch|playstation|\bps5\b|sony|wh-1000|headphone|headset|노트북|laptop|태블릿|tablet|buds|\bgpu\b|graphics/i;

const LATEST_GEN_PATTERN =
  /아이폰\s*1[56]|iphone\s*1[56]|아이패드\s*.*\bm4\b|ipad\s*.*\bm4\b|갤럭시\s*s2[45]|galaxy\s*s2[45]|맥북\s*air\s*m[34]|macbook\s*air\s*m[34]|맥북\s*pro\s*m[34]|macbook\s*pro\s*m[34]|아이패드\s*pro\s*20(2[2-9]|3\d)|ipad\s*pro\s*20(2[2-9]|3\d)/i;

export function isTechListingTitle(
  title: string | null | undefined,
  domain?: string | null
) {
  const query = buildCompareQuery(title, domain) ?? title?.trim();
  if (!query) {
    return false;
  }

  return TECH_TITLE_PATTERN.test(query);
}

export function detectTechDeviceKind(
  title: string | null | undefined,
  domain?: string | null
): TechDeviceKind | null {
  const query = (buildCompareQuery(title, domain) ?? title ?? "").toLowerCase();
  if (!query || !TECH_TITLE_PATTERN.test(query)) {
    return null;
  }

  if (/아이폰|iphone/.test(query)) {
    return "apple_phone";
  }

  if (/아이패드|ipad/.test(query)) {
    return "apple_tablet";
  }

  if (/맥북|macbook|\bmac\b/.test(query)) {
    return "apple_laptop";
  }

  if (/갤럭시|galaxy/.test(query) && /tab|탭|book/.test(query)) {
    return "samsung_tablet";
  }

  if (/갤럭시|galaxy|삼성/.test(query)) {
    return "samsung_phone";
  }

  return "generic_tech";
}

export function isLatestGenTech(title: string | null | undefined, domain?: string | null) {
  const query = buildCompareQuery(title, domain) ?? title ?? "";
  return LATEST_GEN_PATTERN.test(query);
}

export function techDeviceLabel(kind: TechDeviceKind) {
  switch (kind) {
    case "apple_phone":
      return "Apple · iPhone";
    case "apple_tablet":
      return "Apple · iPad";
    case "apple_laptop":
      return "Apple · Mac";
    case "samsung_phone":
      return "Samsung · Galaxy";
    case "samsung_tablet":
      return "Samsung · Tablet";
    default:
      return "IT · 전자기기";
  }
}
