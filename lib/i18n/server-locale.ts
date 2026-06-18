import { cookies } from "next/headers";
import { parseStoredLocale } from "@/lib/i18n/detect-locale";import { getCopy } from "@/lib/i18n/get-copy";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-store";
import type { AppLocale } from "@/lib/i18n/types";

export async function getServerLocale(): Promise<AppLocale> {
  const jar = await cookies();
  const fromCookie = parseStoredLocale(jar.get(LOCALE_COOKIE)?.value);
  if (fromCookie) {
    return fromCookie;
  }

  return "ko";
}

export async function getServerCopy() {
  return getCopy(await getServerLocale());
}
