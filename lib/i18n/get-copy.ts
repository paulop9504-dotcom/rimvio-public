import { copy as copyKo } from "@/lib/copy/human-ko";
import { copyEn } from "@/lib/i18n/bundles/en";
import type { AppLocale, Copy } from "@/lib/i18n/types";

const UI_LOCALES = new Set<AppLocale>(["ko", "en"]);

export function getCopy(locale: AppLocale): Copy {
  if (locale === "ko") {
    return copyKo;
  }

  if (locale === "en") {
    return copyEn;
  }

  return copyEn;
}

export function getUiLocale(locale: AppLocale): "ko" | "en" {
  return UI_LOCALES.has(locale) ? (locale as "ko" | "en") : "en";
}
