"use client";

import { memo, type ReactNode } from "react";
import type { CapabilityId } from "@/lib/capability-registry";
import { MfeRenderer } from "@/components/surface-composition/micro-frontends/mfe-renderer";
import { TopContextSlot } from "@/components/surface-composition/slots/top-context-slot";
import type {
  DispatchSurfaceAction,
  SurfaceCompositionFrame,
  SurfaceNode,
} from "@/lib/surface-composition/surface-node-contract";
import type { SurfaceAction } from "@/lib/surface-engine/surface-contract";
import { SurfacePrimaryUxProvider } from "@/components/surface-composition/surface-primary-ux-context";
import type { SurfacePrimaryUxValue } from "@/components/surface-composition/surface-primary-ux-context";
import { cn } from "@/lib/utils";

export type SurfaceCompositionRuntimeProps = {
  frame: SurfaceCompositionFrame;
  onDispatchCapability: (
    node: SurfaceNode,
    actionId: string,
    capabilityId: CapabilityId,
  ) => void;
  /** Why-line + per-action feedback for primary MFE. */
  primaryUx?: SurfacePrimaryUxValue;
  /** Action execution dock — capability-driven, composed externally. */
  actionDockSlot?: ReactNode;
  className?: string;
};

function toDispatch(
  onDispatchCapability: SurfaceCompositionRuntimeProps["onDispatchCapability"],
): DispatchSurfaceAction {
  return (node: SurfaceNode, action: SurfaceAction) => {
    onDispatchCapability(node, action.id, action.capabilityId);
  };
}

/**
 * Surface Composition Runtime — stateless renderer for slot grid + MFEs.
 */
export const SurfaceCompositionRuntime = memo(function SurfaceCompositionRuntime({
  frame,
  onDispatchCapability,
  primaryUx,
  actionDockSlot,
  className,
}: SurfaceCompositionRuntimeProps) {
  const { layout } = frame;
  const onDispatch = toDispatch(onDispatchCapability);

  if (!layout.primary && layout.secondary.length === 0) {
    return null;
  }

  const body = (
    <section
      className={cn("space-y-3", className)}
      aria-label="Execution surfaces"
      data-surface-composition-version={frame.graph.version}
      data-surface-ux-state={layout.uxState}
      data-composition-key={frame.engine.computedAt}
      data-active-surface-id={frame.collapse.activeSurfaceId ?? undefined}
      data-latent-surface-count={frame.collapse.latentSurfaceIds.length}
    >
      <TopContextSlot node={layout.topContext} />

      {layout.primary ? (
        <div data-layout-slot="primary" className="px-3">
          <MfeRenderer node={layout.primary} onDispatch={onDispatch} />
        </div>
      ) : null}

      {/* Secondary surfaces are latent-only — see surface-collapse-controller. */}

      {actionDockSlot ? (
        <div data-layout-slot="action_dock" className="px-3 pt-1">
          {actionDockSlot}
        </div>
      ) : null}
    </section>
  );

  if (!primaryUx) {
    return body;
  }

  return <SurfacePrimaryUxProvider value={primaryUx}>{body}</SurfacePrimaryUxProvider>;
});
