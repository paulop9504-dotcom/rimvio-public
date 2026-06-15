import { RIMVIO } from "@/lib/brand/rimvio";
import type { ShareLinkInput } from "@/lib/share/share-destinations";
import { buildBeamShareText } from "@/lib/share/beam-share-text";

export function buildKakaoShareText(link: ShareLinkInput) {
  const body = link.share_slug ? buildBeamShareText(link) : `${link.title}\n${link.original_url}`;
  return `${RIMVIO.nameKo}에서 공유 👀\n${body}`;
}

export function canUseNativeShareForKakao() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Best-effort KakaoTalk share — native share → copy + open app. */
export async function runKakaoShare(link: ShareLinkInput): Promise<{
  copiedText: string | null;
  opened: boolean;
  viaNativeShare: boolean;
}> {
  const text = buildKakaoShareText(link);

  if (canUseNativeShareForKakao()) {
    try {
      await navigator.share({
        title: link.title,
        text,
        url: link.share_slug ? undefined : link.original_url,
      });
      return { copiedText: text, opened: true, viaNativeShare: true };
    } catch {
      // fall through to copy + open
    }
  }

  let copiedText: string | null = null;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copiedText = text;
    } catch {
      copiedText = null;
    }
  }

  let opened = false;
  if (typeof window !== "undefined") {
    window.location.href = "kakaotalk://";
    opened = true;
  }

  return { copiedText, opened, viaNativeShare: false };
}

/** Optional Kakao JS SDK — set NEXT_PUBLIC_KAKAO_JS_KEY to enable later. */
export function getKakaoJsKey() {
  return process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim() ?? "";
}

export function isKakaoSdkConfigured() {
  return Boolean(getKakaoJsKey());
}

export async function loadKakaoSdk(): Promise<typeof window.Kakao | null> {
  const key = getKakaoJsKey();
  if (!key || typeof window === "undefined") {
    return null;
  }

  if (window.Kakao?.isInitialized?.()) {
    return window.Kakao;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-rimvio-kakao-sdk="1"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("kakao_sdk_load_failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    script.async = true;
    script.dataset.rimvioKakaoSdk = "1";
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("kakao_sdk_load_failed"));
    document.head.appendChild(script);
  });

  if (!window.Kakao) {
    return null;
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }

  return window.Kakao;
}

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
      };
    };
  }
}
