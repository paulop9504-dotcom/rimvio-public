/**
 * Provider URL builders — ONLY imported inside execution adapters.
 */
import {
  buildKakaoMapSearchHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";

function enc(value: string): string {
  return encodeURIComponent(value.trim());
}

export function pickParam(
  params: Record<string, string>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = params[key]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

export function buildNavigateKakao(params: Record<string, string>): string | null {
  const dest = pickParam(params, "destination", "dest", "query", "place");
  return dest ? buildKakaoMapSearchHref(dest) : null;
}

export function buildNavigateNaver(params: Record<string, string>): string | null {
  const dest = pickParam(params, "destination", "dest", "query", "place");
  return dest ? buildNaverMapSearchWebHref(dest) : null;
}

export function buildNavigateGoogle(params: Record<string, string>): string | null {
  const dest = pickParam(params, "destination", "dest", "query", "place");
  return dest ? `https://www.google.com/maps/search/?api=1&query=${enc(dest)}` : null;
}

export function buildNavigateInternal(params: Record<string, string>): string | null {
  const dest = pickParam(params, "destination", "dest", "query", "place");
  return dest ? `rimvio://navigate?dest=${enc(dest)}` : "rimvio://navigate";
}

export function buildCallTel(params: Record<string, string>): string | null {
  const number = pickParam(params, "phone", "number")?.replace(/\s/g, "");
  return number ? `tel:${number}` : null;
}

export function buildMessageSms(params: Record<string, string>): string | null {
  const number = pickParam(params, "phone", "number")?.replace(/\s/g, "");
  if (!number) {
    return null;
  }
  const body = pickParam(params, "body", "message");
  return body ? `sms:${number}?body=${enc(body)}` : `sms:${number}`;
}

export function buildKakaoTalkOpen(): string {
  return "kakaotalk://talk/friends";
}

export function buildTaxiKakao(params: Record<string, string>): string | null {
  const dest = pickParam(params, "destination", "dest");
  if (dest) {
    return `kakaot://call?dest=${enc(dest)}`;
  }
  return KAKAO_T_APP_OPEN;
}

export function buildAlarmPrompt(params: Record<string, string>): string {
  const title = pickParam(params, "title", "label") ?? "알림";
  return `rimvio://alarm?title=${enc(title)}`;
}

export function buildCalendarPrompt(params: Record<string, string>): string {
  const title = pickParam(params, "title", "label") ?? "일정";
  return `rimvio://calendar?title=${enc(title)}`;
}

export function buildFlightHandoff(): string {
  return "rimvio://trip/flight";
}

export function buildHotelHandoff(): string {
  return "rimvio://trip/hotel";
}

export function buildCheckinHandoff(): string {
  return "rimvio://trip/checkin";
}

export function buildSearchGoogle(params: Record<string, string>): string | null {
  const query = pickParam(params, "query", "title");
  return query ? `https://www.google.com/search?q=${enc(query)}` : null;
}

export function buildGenericPrompt(params: Record<string, string>, tag: string): string {
  const title = pickParam(params, "title", "label") ?? tag;
  return `rimvio://capability/${tag}?title=${enc(title)}`;
}
