"use client";

import { memo } from "react";
import type { SurfaceNode } from "@/lib/surface-composition/surface-node-contract";
import { SurfaceNarrationLine } from "@/components/surface/surface-narration-line";

export type TopContextSlotProps = {
  node: SurfaceNode | null;
};

export const TopContextSlot = memo(function TopContextSlot({ node }: TopContextSlotProps) {
  if (!node?.narration?.summary) {
    return null;
  }
  return (
    <div data-layout-slot="top_context" className="px-3 pb-1">
      <SurfaceNarrationLine surface={node} />
    </div>
  );
});
