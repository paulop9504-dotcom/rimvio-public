import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";
import { parseBestTitleFromUrl } from "@/lib/enrichers/url-intelligence";

export type TicketBrand =
  | "interpark"
  | "melon"
  | "yes24"
  | "ticketlink"
  | "ticket";

const TICKET_HOST_SUFFIXES = [
  "ticket.interpark.com",
  "tickets.interpark.com",
  "ticket.melon.com",
  "ticket.yes24.com",
  "ticketlink.co.kr",
  "booking.nol.universe.com",
];

export function isTicketDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  return TICKET_HOST_SUFFIXES.some((suffix) => {
    const bare = suffix.replace(/^www\./, "");
    return normalized === bare || normalized.endsWith(`.${bare}`);
  });
}

export function isTicketUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (isTicketDomain(host)) {
      return true;
    }

    if (/interpark\.com/i.test(host) && /ticket|goods|play/i.test(path)) {
      return true;
    }

    if (/melon\.com/i.test(host) && /ticket|concert|performance/i.test(path)) {
      return true;
    }

    if (/yes24\.com/i.test(host) && /ticket/i.test(path)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function detectTicketBrand(rawUrl: string, domain: string): TicketBrand {
  const target = `${domain} ${rawUrl}`.toLowerCase();

  if (/interpark|nol\.universe/i.test(target)) return "interpark";
  if (/melon/i.test(target)) return "melon";
  if (/yes24/i.test(target)) return "yes24";
  if (/ticketlink/i.test(target)) return "ticketlink";

  return "ticket";
}

export function ticketBrandTitle(brand: TicketBrand) {
  switch (brand) {
    case "interpark":
      return "인터파크 티켓";
    case "melon":
      return "멜론티켓";
    case "yes24":
      return "YES24 티켓";
    case "ticketlink":
      return "Ticketlink";
    default:
      return "티켓 예매";
  }
}

export function ticketPrimaryLabel(brand: TicketBrand) {
  switch (brand) {
    case "interpark":
      return "🎫 인터파크 티켓 열기";
    case "melon":
      return "🎫 멜론티켓 열기";
    case "yes24":
      return "🎫 YES24 티켓 열기";
    case "ticketlink":
      return "🎫 Ticketlink 열기";
    default:
      return "🎫 티켓 예매 열기";
  }
}

export function ticketAppLabel(brand: TicketBrand) {
  switch (brand) {
    case "interpark":
      return "📱 인터파크 앱으로";
    case "melon":
      return "📱 멜론 앱으로";
    case "yes24":
      return "📱 YES24 앱으로";
    case "ticketlink":
      return "📱 Ticketlink 앱으로";
    default:
      return "📱 티켓 앱으로";
  }
}

export function buildTicketAppHref(rawUrl: string, brand: TicketBrand): string | null {
  try {
    const url = normalizeInputUrl(rawUrl).href;
    const encoded = encodeURIComponent(url);

    switch (brand) {
      case "interpark":
        return `interpark://openurl?url=${encoded}`;
      case "melon":
        return `melonapp://open?url=${encoded}`;
      case "yes24":
        return `yes24://open?url=${encoded}`;
      case "ticketlink":
        return `ticketlink://open?url=${encoded}`;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function parseTicketHintFromUrl(rawUrl: string): string | null {
  return parseBestTitleFromUrl(rawUrl);
}
