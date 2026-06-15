"use client";

import { useCallback, useEffect, useState } from "react";
import { PlaceDiscoveryCards } from "@/components/action-chat/place-discovery-cards";
import type { CafeDiscoveryWire } from "@/lib/context-resolver/places/types";
import { cn } from "@/lib/utils";

type SearchPayload = {
  ok: boolean;
  query: string;
  summary?: string;
  thought?: string;
  cafeDiscovery?: CafeDiscoveryWire | null;
  error?: string;
};

export default function PlaceCardsDevPage() {
  const [query, setQuery] = useState("쿠우쿠우 맛집 추천");
  const [draft, setDraft] = useState("쿠우쿠우 맛집 추천");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<SearchPayload | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      return;
    }
    setLoading(true);
    setQuery(trimmed);
    try {
      const response = await fetch(
        `/api/dev/place-search?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as SearchPayload;
      setPayload(data);
    } catch {
      setPayload({
        ok: false,
        query: trimmed,
        error: "검색 요청에 실패했어요",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch("쿠우쿠우 맛집 추천");
  }, [runSearch]);

  const wire = payload?.cafeDiscovery;
  const hasCards = Boolean(wire?.options?.length);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-rimvio-base px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] font-sans">
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dev · Place cards
        </p>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-foreground">
          맛집 검색 미리보기
        </h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          프로젝트: <strong className="text-foreground">new-project</strong> · 터미널에서{" "}
          <code className="rounded bg-rimvio-surface px-1.5 py-0.5 text-[12px]">npm run dev</code> 실행 후
          열기
        </p>
        <a
          href="/dev/place-cards?q=쿠우쿠우%20맛집%20추천"
          className="mt-2 inline-block text-[14px] font-medium text-rimvio-neon-cyan underline"
        >
          http://localhost:3000/dev/place-cards
        </a>
      </header>

      <form
        className="mb-5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="예: 쿠우쿠우, 강남역 스테이크"
          className="min-h-11 flex-1 rounded-2xl border border-border bg-rimvio-surface px-4 text-[15px] text-foreground shadow-sm outline-none focus:border-rimvio-neon-cyan/40"
        />
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "shrink-0 rounded-2xl bg-rimvio-neon-purple px-4 text-[14px] font-semibold text-white shadow-sm transition active:scale-[0.98]",
            loading && "opacity-60",
          )}
        >
          {loading ? "…" : "검색"}
        </button>
      </form>

      {loading ? (
        <div className="space-y-4">
          <div className="h-5 w-2/3 animate-pulse rounded-lg bg-rimvio-surface-muted" />
          <div className="aspect-[4/3] animate-pulse rounded-[28px] bg-rimvio-surface" />
        </div>
      ) : null}

      {!loading && payload ? (
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-foreground/90">
            {payload.summary ?? payload.error ?? "결과 없음"}
          </p>
          {payload.thought ? (
            <p className="text-[11px] text-muted-foreground">{payload.thought}</p>
          ) : null}
          {hasCards && wire ? (
            <div className="flex flex-col items-start gap-3">
              <div
                className="max-w-[85%] rounded-[18px] rounded-tl-[6px] bg-rimvio-surface px-4 py-3 text-[15px] leading-[1.45] text-foreground shadow-sm ring-1 ring-rimvio-neon-purple/15"
                aria-hidden
              >
                {payload.summary ?? "주변에서 찾아봤어요"}
              </div>
              <PlaceDiscoveryCards wire={wire} />
            </div>
          ) : (
            <p className="rounded-2xl border border-border bg-rimvio-surface px-4 py-6 text-center text-[13px] text-muted-foreground">
              카드가 없어요. 검색어: <strong>{query}</strong>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
