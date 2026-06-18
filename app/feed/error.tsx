"use client";

import { useEffect } from "react";
import { RimvioLogo } from "@/components/rimvio-logo";

type FeedErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Feed-only recovery — avoids the generic Next.js blank error shell. */
export default function FeedError({ error, reset }: FeedErrorProps) {
  useEffect(() => {
    console.error("[feed]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-rimvio-base px-6 py-10 text-center">
      <RimvioLogo size="md" appearance="white" />
      <div className="max-w-sm space-y-2">
        <h1 className="text-[17px] font-semibold text-white/90">피드를 불러오지 못했어요</h1>
        <p className="text-[14px] leading-relaxed text-white/55">
          네트워크나 캐시 문제일 수 있어요. 새로고침 후 다시 시도해 주세요.
        </p>
        {error.message ? (
          <p className="font-mono text-[10px] text-white/25">{error.message}</p>
        ) : null}
        {error.digest ? (
          <p className="font-mono text-[10px] text-white/25">ref: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-rimvio-base"
        >
          다시 시도
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/feed";
          }}
          className="rounded-full border border-white/20 px-5 py-2.5 text-[14px] font-medium text-white/80"
        >
          피드 새로고침
        </button>
      </div>
    </div>
  );
}
