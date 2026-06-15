"use client";

import { cn } from "@/lib/utils";

type PeerProfileAvatarProps = {
  displayName: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  xs: "size-8 text-xs",
  sm: "size-10 text-sm",
  md: "size-12 text-base",
  lg: "size-24 text-2xl",
};

export function PeerProfileAvatar({
  displayName,
  avatarUrl,
  size = "md",
  className,
}: PeerProfileAvatarProps) {
  const initial = displayName.trim().charAt(0) || "?";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400/80 via-violet-400/80 to-fuchsia-400/80 font-semibold text-white",
        sizeClass[size],
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
