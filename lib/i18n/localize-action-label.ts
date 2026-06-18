import type { AppLocale } from "@/lib/i18n/types";
import { getCopy } from "@/lib/i18n/get-copy";

type ActionKey = keyof ReturnType<typeof getCopy>["actions"];

const LABEL_KEYS: Array<{ pattern: RegExp; key: ActionKey }> = [
  { pattern: /그 페이지로 가기|원본 페이지|open in browser|open page/i, key: "openOriginal" },
  { pattern: /^열기$|^open$/i, key: "openLink" },
  { pattern: /참고 링크|reference/i, key: "referenceLink" },
  { pattern: /번역해서 읽기|read translated|translate/i, key: "translateRead" },
  { pattern: /3줄 요약|3-line summary|summary/i, key: "summary3" },
  { pattern: /AI에게|ask ai/i, key: "askAi" },
];

export function localizeActionLabel(label: string, locale: AppLocale): string {
  if (locale === "ko") {
    return label;
  }

  const copy = getCopy(locale);

  for (const rule of LABEL_KEYS) {
    if (rule.pattern.test(label)) {
      return copy.actions[rule.key];
    }
  }

  return label;
}

export function localizeFeedActionLabel(label: string, locale: AppLocale) {
  const cleaned = label
    .replace(
      /^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]+/u,
      ""
    )
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();

  const localized = localizeActionLabel(cleaned, locale);
  const emoji = label.match(/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]+/u)?.[0]?.trim();

  if (emoji && !localized.startsWith(emoji)) {
    return `${emoji} ${localized}`.trim();
  }

  return localized;
}
