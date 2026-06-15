"use client";

import { useMemo } from "react";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import { renderFromProof } from "@/lib/event-os/ui-binding";
import type { RenderFromProofContext } from "@/lib/event-os/ui-binding";
import { ExplainabilityPanel } from "@/components/event-os/explainability-panel";
import { UIStage } from "@/components/event-os/ui-stage";

type EventOSRendererProps = {
  proof: CausalProof | null;
  context?: RenderFromProofContext;
  showExplainability?: boolean;
  className?: string;
};

/**
 * Proof-based renderer — UI = f(CausalProof). No SSOT reads.
 */
export function EventOSRenderer({
  proof,
  context,
  showExplainability = true,
  className,
}: EventOSRendererProps) {
  const ui = useMemo(
    () => (proof ? renderFromProof(proof, context) : null),
    [proof, context?.orchestrator]
  );

  if (!proof || !ui) {
    return null;
  }

  return (
    <div className={className} data-event-os-renderer="proof">
      <UIStage model={ui} />
      {showExplainability ? (
        <ExplainabilityPanel
          proof={proof}
          explainability={ui.explainability}
          className="mt-2"
        />
      ) : null}
    </div>
  );
}
