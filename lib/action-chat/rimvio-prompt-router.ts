/**
 * rimvio:// execution prompts — map to real client actions (not raw sendMessage).
 */

export type RimvioPromptHandlers = {
  sendMessage: (text: string) => void;
  openCalendarSheet?: () => void;
  navigateToCalendar?: () => void;
};

function parseRimvioUri(uri: string): { path: string; params: URLSearchParams } | null {
  const trimmed = uri.trim();
  if (!trimmed.toLowerCase().startsWith("rimvio://")) {
    return null;
  }
  try {
    const url = new URL(trimmed.replace(/^rimvio:\/\//iu, "https://rimvio.local/"));
    const path = url.pathname.replace(/^\//u, "");
    return { path, params: url.searchParams };
  } catch {
    return null;
  }
}

export function isRimvioPromptUri(text: string): boolean {
  return parseRimvioUri(text) !== null;
}

/** Returns true when the URI was handled. */
export function routeRimvioPromptUri(text: string, handlers: RimvioPromptHandlers): boolean {
  const parsed = parseRimvioUri(text);
  if (!parsed) {
    return false;
  }

  const { path, params } = parsed;
  const title = params.get("title")?.trim() ?? params.get("label")?.trim() ?? "";
  const dest = params.get("dest")?.trim() ?? params.get("place")?.trim() ?? "";

  if (path === "calendar" || path.startsWith("calendar/")) {
    if (title) {
      handlers.sendMessage(`${title} 일정 등록해줘`);
      return true;
    }
    if (handlers.openCalendarSheet) {
      handlers.openCalendarSheet();
      return true;
    }
    handlers.navigateToCalendar?.();
    return true;
  }

  if (path === "alarm" || path.startsWith("alarm")) {
    handlers.sendMessage(title ? `${title} 알려줘` : "알림 설정해줘");
    return true;
  }

  if (path === "navigate" || path.startsWith("navigate")) {
    handlers.sendMessage(dest ? `${dest} 길찾기` : "길찾기 해줘");
    return true;
  }

  if (path === "reminder" || path.startsWith("reminder")) {
    handlers.sendMessage(title ? `${title} 알려줘` : "알림 잡아줘");
    return true;
  }

  return false;
}
