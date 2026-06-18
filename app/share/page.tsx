"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { parseSharePayload } from "@/lib/share/parse-share-payload";
import { startAnalyticsFlow, trackFunnel } from "@/lib/analytics/track-client";
import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";
import { isIOS } from "@/lib/platform/device";

const SHARE_TOAST_ID = "share-bridge";

function ShareBridge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    const failAndGoHome = (
      message: string,
      description = "홈으로 돌아갑니다."
    ) => {
      toast.dismiss(SHARE_TOAST_ID);
      toast.error(message, { description });
      router.replace("/");
    };

    let parsed: ReturnType<typeof parseSharePayload>;

    try {
      parsed = parseSharePayload({
        title: searchParams.get("title") ?? undefined,
        text: searchParams.get("text") ?? undefined,
        url: searchParams.get("url") ?? undefined,
      });
    } catch {
      failAndGoHome("공유 링크를 읽지 못했어요.");
      return;
    }

    if (!parsed.url) {
      if (isIOS()) {
        toast.dismiss(SHARE_TOAST_ID);
        router.replace("/?paste=1");
        return;
      }

      failAndGoHome("공유된 링크를 찾지 못했어요.", "받은함에서 붙여넣어 주세요.");
      return;
    }

    toast("👀 림비오가 다음 행동을 찾는 중…", { id: SHARE_TOAST_ID });

    startAnalyticsFlow();

    let domain: string | null = null;
    try {
      domain = normalizeInputUrl(parsed.url!).hostname.replace(/^www\./, "");
    } catch {
      domain = null;
    }

    trackFunnel("share", { domain });

    const params = new URLSearchParams();
    params.set("url", parsed.url);
    if (parsed.title) {
      params.set("title", parsed.title);
    }

    toast.dismiss(SHARE_TOAST_ID);
    router.replace(`/now?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}

export default function SharePage() {
  return (
    <Suspense fallback={null}>
      <ShareBridge />
    </Suspense>
  );
}
