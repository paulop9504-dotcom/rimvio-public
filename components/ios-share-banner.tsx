"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { RIMVIO } from "@/lib/brand/rimvio";
import { isAndroid, isIOS, isStandalonePwa } from "@/lib/platform/device";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "rimvio-mobile-browser-banner-dismissed";

export function IosShareBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    if (isStandalonePwa()) {
      return;
    }

    const ios = isIOS();
    const android = isAndroid();
    if (!ios && !android) {
      return;
    }

    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") {
        return;
      }
    } catch {
      // Ignore storage errors.
    }

    setPlatform(ios ? "ios" : "android");
    setVisible(true);
  }, []);

  if (!visible || !platform) {
    return null;
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore.
    }
    setVisible(false);
  };

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-[60] mx-auto max-w-md px-3",
        "pt-[max(0.5rem,env(safe-area-inset-top))]"
      )}
    >
      <div className="rounded-2xl bg-foreground px-4 py-3 text-background shadow-lg ring-1 ring-white/10">
        <div className="flex items-start gap-3">
          <span className="text-lg leading-none" aria-hidden>
            {platform === "ios" ? "📱" : "🤖"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {platform === "ios" ? "iPhone — 앱처럼 쓰기" : "Android — 앱처럼 쓰기"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-background/70">
              {platform === "ios" ? (
                <>
                  Safari <strong>공유 → 홈 화면에 추가</strong>하면 주소창 없이 전체
                  화면으로 쓸 수 있어요.
                </>
              ) : (
                <>
                  Chrome 메뉴 <strong>홈 화면에 추가</strong>하면 앱처럼 실행돼요.
                </>
              )}
            </p>
            <div className="mt-2 text-xs leading-relaxed text-background/70">
              링크 넣기: 공유 → <strong>링크 복사</strong> →{" "}
              <Link href="/inbox?paste=1" className="underline underline-offset-2">
                {copy.inbox.title}
              </Link>
              에 붙여넣기
            </div>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={dismiss}
            className="rounded-lg p-1 text-background/70 transition-colors hover:text-background"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
