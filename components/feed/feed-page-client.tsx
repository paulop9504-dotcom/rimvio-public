"use client";

import { Suspense } from "react";
import { FeedErrorBoundary } from "@/components/feed/feed-error-boundary";
import { FeedSlotShell } from "@/components/feed/feed-slot-shell";

/** /feed client entry — no ActionShorts / useActionChat stack. */
export function FeedPageClient() {
  return (
    <FeedErrorBoundary>
      <Suspense fallback={null}>
        <FeedSlotShell className="min-h-0 flex-1" />
      </Suspense>
    </FeedErrorBoundary>
  );
}
