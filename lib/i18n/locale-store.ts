import { parseStoredLocale } from "@/lib/i18n/detect-locale";
import type { AppLocale } from "@/lib/i18n/types";
export const LOCALE_COOKIE = "rimvio.locale";
export const LOCALE_STORAGE_KEY = "rimvio.locale.v1";
export const LOCALE_UPDATED = "rimvio-locale-updated";

export function readStoredLocale(): AppLocale | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseStoredLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: AppLocale): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale === "ko" ? "ko" : locale;
    window.dispatchEvent(new CustomEvent(LOCALE_UPDATED));
  } catch {
    // ignore quota / private mode
  }
}

export function resolveAppLocale(): AppLocale {
  return readStoredLocale() ?? "ko";
}

export function autoInitAppLocale(): AppLocale {
  const existing = readStoredLocale();
  if (existing) {
    document.documentElement.lang = existing === "ko" ? "ko" : existing;
    return existing;
  }

  const detected = "ko" as AppLocale;
  writeStoredLocale(detected);
  return detected;
}

export function getAppLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "ko";
  }

  return resolveAppLocale();
}
