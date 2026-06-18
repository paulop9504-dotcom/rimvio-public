import {
  mapScreenshotKindToKernelCategory,
  primaryActionFamilyForKernel,
} from "@/lib/intent/category-map";
import { collectBehaviorSignals } from "@/lib/intent/collect-behavior-signals";
import { readBurstSessionFromTrajectory } from "@/lib/intent/burst-session";
import type { InteractionMode, TrajectoryCluster } from "@/lib/intent/kernel-types";
import type { SaveTrajectoryEntry } from "@/lib/intent/kernel-types";
import type { ActionFamily } from "@/lib/personalization/types";

export type KernelSnapshotAttach = {
  interaction_mode: InteractionMode;
  trajectory_cluster: TrajectoryCluster;
  burst_session_id: string | null;
  is_burst_session: boolean;
  primary_action_family: ActionFamily;
};

function kernelCategoryForLink(input: {
  category?: string | null;
  domain?: string | null;
  title?: string | null;
  source_type?: string | null;
}) {
  if (input.source_type === "screenshot") {
    return mapScreenshotKindToKernelCategory({
      kind:
        input.category === "travel"
          ? "place"
          : input.category === "shopping"
            ? "product"
            : null,
      domain: input.domain,
      category: input.category,
      title: input.title,
    });
  }

  return mapScreenshotKindToKernelCategory({
    kind: "url",
    domain: input.domain,
    category: input.category,
    title: input.title,
  });
}

export function attachKernelSnapshot(input: {
  saveHistory: SaveTrajectoryEntry[];
  link?: {
    category?: string | null;
    domain?: string | null;
    title?: string | null;
    source_type?: string | null;
  } | null;
  now?: number;
}): KernelSnapshotAttach {
  const now = input.now ?? Date.now();
  const burst = readBurstSessionFromTrajectory(input.saveHistory, now);
  const behavior = collectBehaviorSignals(
    {
      hour: new Date(now).getHours(),
      saveHistory: input.saveHistory,
      current: input.link ?? {},
    },
    now
  );

  const kernelCategory = input.link ? kernelCategoryForLink(input.link) : "unknown";

  return {
    interaction_mode: behavior.interaction_mode,
    trajectory_cluster: behavior.trajectory.dominant_cluster,
    burst_session_id: burst.burst_session_id,
    is_burst_session: burst.is_burst_session,
    primary_action_family: primaryActionFamilyForKernel({
      kernelCategory,
      band: "assistive",
      crossLinkPattern: behavior.cross_link.pattern,
    }),
  };
}
