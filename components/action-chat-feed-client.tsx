"use client";

import dynamic from "next/dynamic";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import type { ComponentProps } from "react";
import type { ActionChatFeed } from "@/components/action-chat-feed";

const ActionChatFeedLazy = dynamic(
  () => import("@/components/action-chat-feed").then((mod) => mod.ActionChatFeed),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <ActionCardSkeleton />
      </div>
    ),
  },
);

export type ActionChatFeedClientProps = ComponentProps<typeof ActionChatFeed>;

/** Client-only feed shell — avoids SSR/hydration crashes in heavy slot composition. */
export function ActionChatFeedClient(props: ActionChatFeedClientProps) {
  return <ActionChatFeedLazy {...props} />;
}
