"use client";

import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { cn } from "@/lib/utils";

export type ContextMediaUploaderBadgeProps = {
  item: ContextMediaReelItem;
  /** Local-only captures without author metadata — treat as self. */
  selfDisplayName?: string | null;
  selfAvatarUrl?: string | null;
  className?: string;
};

function resolveUploaderIdentity(input: ContextMediaUploaderBadgeProps): {
  displayName: string;
  avatarUrl?: string | null;
} {
  const authorName = input.item.authorDisplayName?.trim();
  const authorAvatar = input.item.authorAvatarUrl?.trim();
  if (authorName || authorAvatar) {
    return {
      displayName: authorName || "?",
      avatarUrl: authorAvatar || null,
    };
  }

  if (input.item.allowLocalBlob === true) {
    return {
      displayName: input.selfDisplayName?.trim() || "나",
      avatarUrl: input.selfAvatarUrl ?? null,
    };
  }

  return {
    displayName: authorName || "?",
    avatarUrl: authorAvatar || null,
  };
}

/** Top-right uploader avatar on map / pin media overlays. */
export function ContextMediaUploaderBadge({
  item,
  selfDisplayName,
  selfAvatarUrl,
  className,
}: ContextMediaUploaderBadgeProps) {
  const { displayName, avatarUrl } = resolveUploaderIdentity({
    item,
    selfDisplayName,
    selfAvatarUrl,
  });

  return (
    <span
      className={cn(
        "pointer-events-none absolute right-2 top-2 z-[3] rounded-full ring-2 ring-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.35)]",
        className,
      )}
      title={`${displayName}님이 올림`}
      aria-label={`${displayName}님이 올림`}
      data-context-media-uploader
    >
      <PeerProfileAvatar
        displayName={displayName}
        avatarUrl={avatarUrl}
        size="xs"
        className="size-7 text-[11px]"
      />
    </span>
  );
}
