import type { copy as copyKo } from "@/lib/copy/human-ko";

export type Copy = typeof copyKo;

export type AppLocale =
  | "ko"
  | "en"
  | "ja"
  | "zh"
  | "th"
  | "vi"
  | "id"
  | "hi"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "fil";

export const APP_LOCALES: AppLocale[] = [
  "ko",
  "en",
  "ja",
  "zh",
  "th",
  "vi",
  "id",
  "hi",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "fil",
];

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as string[]).includes(value);
}
