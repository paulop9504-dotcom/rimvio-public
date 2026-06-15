import { isAppLocale, type AppLocale } from "@/lib/i18n/types";

const LOCALE_RULES: Array<{ prefix: string; locale: AppLocale }> = [
  { prefix: "ko", locale: "ko" },
  { prefix: "ja", locale: "ja" },
  { prefix: "zh-tw", locale: "zh" },
  { prefix: "zh-hk", locale: "zh" },
  { prefix: "zh", locale: "zh" },
  { prefix: "th", locale: "th" },
  { prefix: "vi", locale: "vi" },
  { prefix: "id", locale: "id" },
  { prefix: "hi", locale: "hi" },
  { prefix: "fil", locale: "fil" },
  { prefix: "tl", locale: "fil" },
  { prefix: "es", locale: "es" },
  { prefix: "fr", locale: "fr" },
  { prefix: "de", locale: "de" },
  { prefix: "it", locale: "it" },
  { prefix: "pt", locale: "pt" },
  { prefix: "en", locale: "en" },
];

export function detectLocaleFromLanguageTags(
  tags: string | string[] | null | undefined
): AppLocale {
  const haystack = (
    Array.isArray(tags) ? tags.join(" ") : tags ?? "ko"
  ).toLowerCase();

  for (const { prefix, locale } of LOCALE_RULES) {
    if (haystack.includes(prefix)) {
      return locale;
    }
  }

  return "en";
}

export function detectAppLocaleFromBrowser(): AppLocale {
  if (typeof navigator === "undefined") {
    return "ko";
  }

  return detectLocaleFromLanguageTags([
    navigator.language,
    ...(navigator.languages ?? []),
  ]);
}

export function localeToTranslateTarget(locale: AppLocale): string {
  switch (locale) {
    case "ko":
      return "ko";
    case "ja":
      return "ja";
    case "zh":
      return "zh-CN";
    case "th":
      return "th";
    case "vi":
      return "vi";
    case "id":
      return "id";
    case "hi":
      return "hi";
    case "es":
      return "es";
    case "fr":
      return "fr";
    case "de":
      return "de";
    case "it":
      return "it";
    case "pt":
      return "pt";
    case "fil":
      return "tl";
    default:
      return "en";
  }
}

export function parseStoredLocale(raw: string | null | undefined): AppLocale | null {
  if (!raw || !isAppLocale(raw)) {
    return null;
  }

  return raw;
}
