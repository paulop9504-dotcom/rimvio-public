import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

export type OttBrand =
  | "netflix"
  | "tving"
  | "wavve"
  | "disney"
  | "watcha"
  | "coupangplay"
  | "ott";

const OTT_HOST_SUFFIXES = [
  "netflix.com",
  "tving.com",
  "wavve.com",
  "disneyplus.com",
  "watcha.com",
  "coupangplay.com",
  "laftel.net",
];

export function isOttDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  return OTT_HOST_SUFFIXES.some((suffix) => {
    const bare = suffix.replace(/^www\./, "");
    return normalized === bare || normalized.endsWith(`.${bare}`);
  });
}

export function isOttUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return isOttDomain(host);
  } catch {
    return false;
  }
}

export function detectOttBrand(rawUrl: string, domain: string): OttBrand {
  const target = `${domain} ${rawUrl}`.toLowerCase();

  if (/netflix/i.test(target)) return "netflix";
  if (/tving/i.test(target)) return "tving";
  if (/wavve/i.test(target)) return "wavve";
  if (/disney/i.test(target)) return "disney";
  if (/watcha/i.test(target)) return "watcha";
  if (/coupangplay|coupang.*play/i.test(target)) return "coupangplay";
  if (/laftel/i.test(target)) return "ott";

  return "ott";
}

export function ottPrimaryLabel(brand: OttBrand) {
  switch (brand) {
    case "netflix":
      return "▶️ Netflix에서 보기";
    case "tving":
      return "▶️ TVING에서 보기";
    case "wavve":
      return "▶️ Wavve에서 보기";
    case "disney":
      return "▶️ Disney+에서 보기";
    case "watcha":
      return "▶️ Watcha에서 보기";
    case "coupangplay":
      return "▶️ 쿠팡플레이에서 보기";
    default:
      return "▶️ OTT에서 보기";
  }
}

export function ottAppLabel(brand: OttBrand) {
  switch (brand) {
    case "netflix":
      return "📱 Netflix 앱으로";
    case "tving":
      return "📱 TVING 앱으로";
    case "wavve":
      return "📱 Wavve 앱으로";
    case "disney":
      return "📱 Disney+ 앱으로";
    case "watcha":
      return "📱 Watcha 앱으로";
    case "coupangplay":
      return "📱 쿠팡플레이 앱으로";
    default:
      return "📱 OTT 앱으로";
  }
}

export function buildOttAppHref(rawUrl: string, brand: OttBrand): string | null {
  try {
    const url = normalizeInputUrl(rawUrl).href;
    const encoded = encodeURIComponent(url);

    switch (brand) {
      case "netflix": {
        const titleMatch = url.match(/\/title\/(\d+)/i);
        if (titleMatch?.[1]) {
          return `nflx://www.netflix.com/title/${titleMatch[1]}`;
        }
        return `nflx://www.netflix.com/browse?url=${encoded}`;
      }
      case "tving":
        return `tvingapp://open?url=${encoded}`;
      case "wavve":
        return `wavve://open?url=${encoded}`;
      case "disney":
        return `disneyplus://open?url=${encoded}`;
      case "watcha":
        return `watcha://open?url=${encoded}`;
      case "coupangplay":
        return `coupang://link?url=${encoded}`;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
