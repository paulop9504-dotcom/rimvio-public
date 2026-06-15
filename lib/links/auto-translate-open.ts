import { buildPageTranslateHref } from "@/lib/actions/search-urls";
import { localeToTranslateTarget } from "@/lib/i18n/detect-locale";
import { getAppLocale } from "@/lib/i18n/locale-store";
import type { AppLocale } from "@/lib/i18n/types";

const SKIP_HOSTS =
  /(^|\.)translate\.google\.com$|(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)instagram\.com$|(^|\.)tiktok\.com$|(^|\.)netflix\.com$|(^|\.)tving\.com$|(^|\.)wavve\.com$|(^|\.)coupang\.com$|(^|\.)baemin\.com$|(^|\.)kakaomap\.com$|(^|\.)map\.naver\.com$|(^|\.)maps\.google\.com$|(^|\.)maps\.apple\.com$|(^|\.)apps\.apple\.com$|(^|\.)play\.google\.com$/i;

const KOREAN_NATIVE =
  /\.kr$|naver\.com|kakao\.com|daum\.net|yanolja\.com|goodchoice\.kr|visitkorea|interpark\.com|musinsa\.com|11st\.co\.kr|gmarket\.co\.kr|ssg\.com|lotte|hankyung|mk\.co|chosun|joins|donga|hani\.co|sbs\.co|kbs\.co|mbn\.co|newsis|yonhap|yna\.|nate\.com/i;

const LATIN_NATIVE =
  /\.(com|org|net|io|gov|edu)(\/|$)|wikipedia\.org|github\.com|medium\.com|reddit\.com|bbc\.|cnn\.|nytimes\./i;

function isHttpHref(href: string) {
  return /^https?:\/\//i.test(href.trim());
}

function isAlreadyTranslated(href: string) {
  return /translate\.google\.com\/translate|papago\.naver\.com\/website/i.test(href);
}

function shouldSkipTranslatePath(pageUrl: string) {
  try {
    const { hostname, pathname } = new URL(pageUrl);
    if (/^maps\.google\.com$/i.test(hostname)) {
      return true;
    }

    if (/^maps\.apple\.com$/i.test(hostname)) {
      return true;
    }

    if (/google\.com$/i.test(hostname) && pathname.startsWith("/maps")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function hostFromUrl(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function looksKorean(url: string, host: string) {
  return KOREAN_NATIVE.test(host) || /[가-힣]/.test(decodeURIComponent(url));
}

function looksLatin(url: string, host: string) {
  return LATIN_NATIVE.test(host) || /^https?:\/\/[^/?#]*[a-z0-9.-]+\/[a-z]/i.test(url);
}

export function shouldAutoTranslatePage(
  pageUrl: string,
  locale: AppLocale = getAppLocale()
): boolean {
  if (!isHttpHref(pageUrl) || isAlreadyTranslated(pageUrl)) {
    return false;
  }

  if (shouldSkipTranslatePath(pageUrl)) {
    return false;
  }

  const host = hostFromUrl(pageUrl);
  if (!host || SKIP_HOSTS.test(host)) {
    return false;
  }

  const korean = looksKorean(pageUrl, host);
  const latin = looksLatin(pageUrl, host);

  if (locale === "ko") {
    if (korean || host.endsWith(".kr")) {
      return false;
    }
    return latin;
  }

  if (locale === "ja") {
    return !/\.jp$|yahoo\.co\.jp|rakuten|amazon\.co\.jp/i.test(host);
  }

  if (locale === "zh") {
    return !/\.cn$|\.tw$|baidu\.com|weibo\.com/i.test(host);
  }

  if (locale === "hi") {
    return !/\.in$|indiatimes|timesofindia|ndtv/i.test(host);
  }

  if (locale === "fil") {
    return !/\.ph$|wheninmanila|rappler/i.test(host);
  }

  if (locale === "en") {
    return korean || /[가-힣]/.test(pageUrl);
  }

  return korean || (latin && !korean);
}

export function resolveAutoTranslatedOpenHref(
  pageUrl: string,
  locale?: AppLocale
): string {
  const activeLocale = locale ?? getAppLocale();
  if (!shouldAutoTranslatePage(pageUrl, activeLocale)) {
    return pageUrl;
  }

  return buildPageTranslateHref(
    pageUrl,
    localeToTranslateTarget(activeLocale),
    activeLocale
  );
}
