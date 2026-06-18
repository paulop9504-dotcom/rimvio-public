"use client";

import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { ExplainabilityPanelModel } from "@/lib/event-os/ui-binding";
import { cn } from "@/lib/utils";

type ExplainabilityPanelProps = {
  proof: CausalProof;
  explainability: ExplainabilityPanelModel;
  className?: string;
};

/** Why the UI changed — always paired with proof-based render. */
export function ExplainabilityPanel({
  proof,
  explainability,
  className,
}: ExplainabilityPanelProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 text-[12px] text-slate-700",
        className
      )}
      aria-label="Causal proof explainability"
      data-proof-hash={proof.proofHash}
    >
      <p className="font-medium text-slate-800">{explainability.headline}</p>
      <dl className="mt-2 space-y-1.5">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Validation
          </dt>
          <dd>{explainability.validationReason}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Commit
          </dt>
          <dd>{explainability.commitDecisionReason}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            State diff
          </dt>
          <dd className="break-words">{explainability.stateDiffSummary}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Causal chain
          </dt>
          <dd>
            <ol className="list-decimal pl-4">
              {explainability.causalChain.map((step, index) => (
                <li key={`${index}-${step.slice(0, 24)}`}>{step}</li>
              ))}
            </ol>
          </dd>
        </div>
      </dl>
    </section>
  );
}
