"use client";

import { Shimmer } from "@/components/ui/shimmer";
import { cn } from "@/lib/utils";

export function NowLoadingShimmer() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <div className="relative overflow-hidden rounded-2xl px-2 py-1">
        <Shimmer className="absolute inset-0 rounded-2xl opacity-40" />
        <p
          className={cn(
            "relative text-lg font-medium leading-relaxed tracking-tight",
            "bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground",
            "bg-[length:220%_100%] bg-clip-text text-transparent",
            "animate-[shimmer_1.8s_ease-in-out_infinite]"
          )}
        >
          👀 림비오가 다음 행동을 찾는 중...
        </p>
      </div>
    </div>
  );
}
