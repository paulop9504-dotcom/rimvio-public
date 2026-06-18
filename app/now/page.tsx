import { Suspense } from "react";
import { NowLoadingShimmer } from "@/components/now-loading-shimmer";
import { NowPageClient } from "@/components/now-page-client";

export default function NowPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <main className="flex flex-1 flex-col pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Suspense fallback={<NowLoadingShimmer />}>
          <NowPageClient />
        </Suspense>
      </main>
    </div>
  );
}
