"use client";

import { MessageSquare, Share2, Users } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type RimvioProductStoryScreensProps = {
  className?: string;
};

/** 스토어·랜딩과 동일한 3장 스토리 — 대화 렌즈 / 두 탭 / 링크 실행 */
export function RimvioProductStoryScreens({
  className,
}: RimvioProductStoryScreensProps) {
  const copy = useCopy();

  const screens = [
    {
      icon: MessageSquare,
      iconClass: "text-rimvio-neon-purple bg-rimvio-neon-purple/15",
      title: copy.product.story1Title,
      body: copy.product.story1Body,
      mock: (
        <div className="mt-2 space-y-1.5 rounded-xl bg-black/30 px-2.5 py-2">
          <p className="text-[10px] text-white/55">친구</p>
          <p className="text-[11px] text-white/90">이번주 금요일 CGV 보자</p>
          <div className="flex flex-wrap gap-1">
            <span className="rounded-full bg-rimvio-neon-cyan/20 px-2 py-0.5 text-[9px] font-medium text-rimvio-neon-cyan">
              📅 일정
            </span>
            <span className="rounded-full bg-rimvio-neon-green/15 px-2 py-0.5 text-[9px] font-medium text-rimvio-neon-green">
              🧭 길찾기
            </span>
          </div>
          <p className="text-[9px] text-white/40">탭할 때만 실행</p>
        </div>
      ),
    },
    {
      icon: Users,
      iconClass: "text-rimvio-neon-cyan bg-rimvio-neon-cyan/15",
      title: copy.product.story2Title,
      body: copy.product.story2Body,
      mock: (
        <div className="mt-2 flex gap-1 rounded-xl bg-black/30 p-1">
          <span className="flex-1 rounded-lg bg-rimvio-neon-cyan/25 py-1.5 text-center text-[10px] font-semibold text-white">
            {copy.nav.peers}
          </span>
          <span className="flex-1 rounded-lg py-1.5 text-center text-[10px] font-medium text-white/55">
            {copy.nav.feed}
          </span>
        </div>
      ),
    },
    {
      icon: Share2,
      iconClass: "text-rimvio-neon-green bg-rimvio-neon-green/15",
      title: copy.product.story3Title,
      body: copy.product.story3Body,
      mock: (
        <div className="mt-2 rounded-xl bg-black/30 px-2.5 py-2">
          <p className="truncate text-[10px] text-white/55">youtube.com/…</p>
          <p className="mt-1 text-[11px] font-semibold text-white">▶ 바로 보기</p>
        </div>
      ),
    },
  ] as const;

  return (
    <ol className={cn("space-y-3", className)} aria-label={copy.product.storyEyebrow}>
      {screens.map((screen, index) => {
        const Icon = screen.icon;
        return (
          <li
            key={screen.title}
            className="rounded-2xl border border-white/[0.08] bg-rimvio-surface-muted/50 p-3"
          >
            <div className="flex gap-2.5">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums text-white/70",
                  "bg-white/[0.06]",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  screen.iconClass,
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground">
                  {screen.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {screen.body}
                </p>
                {screen.mock}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
