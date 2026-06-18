import { buildContext } from "@/lib/context-builder/build-context";
import type { CognitiveContext } from "@/lib/context-builder/types";
import { rankContextOpportunities } from "@/lib/cognitive-opportunity/rank-context-opportunities";
import type { ContextOpportunity } from "@/lib/cognitive-opportunity/types";
import { toCognitiveEvents } from "@/lib/cognitive-orchestrator/event-stream-adapter";
import type { EventStream } from "@/lib/cognitive-orchestrator/types";
import { renderSurfaceUi } from "@/lib/surface-render-contract/render-surface-ui";
import type { SurfaceUiState } from "@/lib/surface-render-contract/types";
import { routeSurfaces } from "@/lib/surface-router/route-surfaces";
import type { SurfaceRouterResult } from "@/lib/surface-router/types";
import { evaluateVisibility } from "@/lib/visibility-bridge/evaluate-visibility";
import type { VisibilityDecision } from "@/lib/visibility-bridge/types";

export type PipelineDraft = {
  context: CognitiveContext;
  opportunities: ContextOpportunity[];
  decisions: VisibilityDecision[];
  surfaceRoute: SurfaceRouterResult;
  uiState: SurfaceUiState;
};

export type ExecutePipelineInput = {
  eventStream: readonly EventStream[];
  now?: number;
};

export type ExecutePipelineResult = {
  draft: PipelineDraft;
  executionLog: string[];
};

/** Pure computation pipeline — no commit, no feedback, no guard. */
export function executeCognitivePipeline(input: ExecutePipelineInput): ExecutePipelineResult {
  const executionLog: string[] = [];
  const cognitiveEvents = toCognitiveEvents(input.eventStream);
  const cycleNow =
    input.now ??
    (input.eventStream.length === 0
      ? Date.now()
      : Math.max(...input.eventStream.map((event) => event.timestamp)));

  executionLog.push("step:1:context:build");
  const context = buildContext(cognitiveEvents, { now: cycleNow });

  executionLog.push("step:2:opportunity:rank");
  const { opportunities } = rankContextOpportunities({
    context,
    eventPool: cognitiveEvents,
  });

  executionLog.push("step:3:visibility:evaluate");
  const { decisions } = evaluateVisibility({
    context,
    opportunities,
  });

  executionLog.push("step:4:surface:route");
  const surfaceRoute = routeSurfaces({
    decisions,
    context,
  });

  executionLog.push("step:5:surface:render");
  const { uiState } = renderSurfaceUi({
    decisions,
    opportunities,
    eventPool: cognitiveEvents,
  });

  return {
    draft: {
      context,
      opportunities,
      decisions,
      surfaceRoute,
      uiState,
    },
    executionLog,
  };
}
