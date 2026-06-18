"use client";

import { memo } from "react";
import { SurfaceMfShell } from "@/components/surface-composition/micro-frontends/surface-mf-shell";
import type { SurfaceNode, DispatchSurfaceAction } from "@/lib/surface-composition/surface-node-contract";

export type SecondarySurfaceMfProps = {
  node: SurfaceNode;
  onDispatch: DispatchSurfaceAction;
};

/** Secondary slot — no primary CTA (avoids competing actions). */
export const SecondarySurfaceMf = memo(function SecondarySurfaceMf({
  node,
  onDispatch,
}: SecondarySurfaceMfProps) {
  return (
    <SurfaceMfShell node={node} className="bg-white/80 p-3 shadow-none">
      <p className="text-[13px] font-medium text-rimvio-ink/75">{node.title}</p>
      {node.secondaryActions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {node.secondaryActions.slice(0, 2).map((action) => (
            <button
              key={action.id}
              type="button"
              data-surface-cta="secondary"
              className="rounded-full border border-black/[0.08] px-3 py-1 text-[11px] text-rimvio-ink/70"
              onClick={() => onDispatch(node, action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </SurfaceMfShell>
  );
});
