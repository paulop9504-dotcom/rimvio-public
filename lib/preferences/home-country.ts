import {
  isCountryCode,
  type CountryCode,
} from "@/lib/links/spark-locale";

const STORAGE_KEY = "rimvio.home-country.v1";

export const HOME_COUNTRY_UPDATED = "rimvio-home-country-updated";

const BROWSER_LOCALE_MAP: Array<{ prefix: string; code: CountryCode }> = [
  { prefix: "ko", code: "KR" },
  { prefix: "ja", code: "JP" },
  { prefix: "fil", code: "PH" },
  { prefix: "tl", code: "PH" },
  { prefix: "th", code: "TH" },
  { prefix: "vi", code: "VN" },
  { prefix: "zh-tw", code: "TW" },
  { prefix: "zh-hk", code: "TW" },
  { prefix: "zh", code: "CN" },
  { prefix: "id", code: "ID" },
  { prefix: "en-au", code: "AU" },
  { prefix: "en-gb", code: "GB" },
  { prefix: "en-us", code: "US" },
  { prefix: "hi", code: "US" },
  { prefix: "en", code: "US" },
  { prefix: "fr", code: "FR" },
  { prefix: "de", code: "DE" },
  { prefix: "it", code: "IT" },
  { prefix: "es", code: "ES" },
];

export function suggestHomeCountryFromBrowser(): CountryCode {
  if (typeof navigator === "undefined") {
    return "KR";
  }

  const locale = `${navigator.language} ${navigator.languages?.join(" ") ?? ""}`.toLowerCase();

  for (const { prefix, code } of BROWSER_LOCALE_MAP) {
    if (locale.includes(prefix)) {
      return code;
    }
  }

  return "KR";
}

export function hasSetHomeCountry(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return localStorage.getItem(STORAGE_KEY) != null;
  } catch {
    return true;
  }
}

export function getHomeCountry(): CountryCode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || !isCountryCode(raw)) {
      return null;
    }

    return raw;
  } catch {
    return null;
  }
}

export function autoInitHomeCountry(): CountryCode {
  const existing = getHomeCountry();
  if (existing) {
    return existing;
  }

  const suggested = suggestHomeCountryFromBrowser();
  setHomeCountry(suggested);
  return suggested;
}

export function resolveHomeCountry(): CountryCode {
  return getHomeCountry() ?? suggestHomeCountryFromBrowser();
}

export function setHomeCountry(code: CountryCode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent(HOME_COUNTRY_UPDATED));
  } catch {
    // ignore quota / private mode
  }
}
