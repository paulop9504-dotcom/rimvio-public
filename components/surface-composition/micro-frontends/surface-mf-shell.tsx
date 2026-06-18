"use client";

import { memo, type ReactNode } from "react";
import type { SurfaceNode } from "@/lib/surface-composition/surface-node-contract";
import { cn } from "@/lib/utils";

export type SurfaceMfShellProps = {
  node: SurfaceNode;
  children: ReactNode;
  className?: string;
  /** Feed scroll sits on dark base — stronger card chrome. */
  variant?: "default" | "feed";
};

/** Shared chrome — MFEs own inner layout only. */
export const SurfaceMfShell = memo(function SurfaceMfShell({
  node,
  children,
  className,
  variant = "feed",
}: SurfaceMfShellProps) {
  return (
    <article
      className={cn(
        variant === "feed"
          ? "rounded-2xl border border-white/12 bg-white/[0.97] p-4 shadow-lg shadow-black/25 ring-1 ring-white/10"
          : "rounded-2xl border border-black/[0.06] bg-white/95 p-4 shadow-sm",
        className,
      )}
      data-surface-id={node.id}
      data-surface-type={node.type}
      data-surface-mfe={node.mfeId}
      data-layout-slot={node.layoutSlot}
    >
      {children}
    </article>
  );
});
