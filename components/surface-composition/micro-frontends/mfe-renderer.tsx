"use client";

import { memo } from "react";
import { PrimarySurfaceMf } from "@/components/surface-composition/micro-frontends/primary-surface-mf";
import {
  IdleSurfaceMf,
  StartHereSurfaceMf,
} from "@/components/surface-composition/micro-frontends/start-here-surface-mf";
import { IntentMergedSurfaceMf } from "@/components/surface-composition/micro-frontends/intent-merged-surface-mf";
import { SurfaceStackCollapsedMf } from "@/components/surface-composition/micro-frontends/surface-stack-collapsed-mf";
import type {
  DispatchSurfaceAction,
  SurfaceMfeId,
  SurfaceNode,
} from "@/lib/surface-composition/surface-node-contract";

export type MfeRendererProps = {
  node: SurfaceNode;
  onDispatch: DispatchSurfaceAction;
};

function renderByMfeId(mfeId: SurfaceMfeId, props: MfeRendererProps) {
  switch (mfeId) {
    case "StartHereSurfaceMF":
      return <StartHereSurfaceMf {...props} />;
    case "IdleSurfaceMF":
      return <IdleSurfaceMf {...props} />;
    case "IntentMergedSurfaceMF":
      return <IntentMergedSurfaceMf {...props} />;
    case "SurfaceStackCollapsedMF":
      return <SurfaceStackCollapsedMf {...props} />;
    case "TravelSurfaceMF":
    case "ScheduleSurfaceMF":
    case "ReminderSurfaceMF":
    case "FoodSurfaceMF":
    case "GoalSurfaceMF":
    case "GenericSurfaceMF":
    case "PrimarySurfaceMF":
    default:
      return <PrimarySurfaceMf {...props} />;
  }
}

/** Registry dispatch — no cross-MFE imports. */
export const MfeRenderer = memo(function MfeRenderer(props: MfeRendererProps) {
  return renderByMfeId(props.node.mfeId, props);
});
