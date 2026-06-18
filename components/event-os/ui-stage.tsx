"use client";

import type { ProofUIRenderModel } from "@/lib/event-os/ui-binding";
import { cn } from "@/lib/utils";

type UIStageProps = {
  model: ProofUIRenderModel;
  className?: string;
};

/** Renders proof-derived instructions only — no SSOT subscription. */
export function UIStage({ model, className }: UIStageProps) {
  if (model.instructions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("rounded-lg border border-indigo-100/80 bg-indigo-50/40 px-3 py-2", className)}
      data-proof-hash={model.proofHash}
      data-ui-diff={model.uiDiff}
      aria-label="Event OS proof UI stage"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500/90">
        Proof UI
      </p>
      <ul className="mt-1 space-y-0.5">
        {model.instructions.map((instruction, index) => (
          <li
            key={`${instruction.type}-${instruction.target}-${index}`}
            className="font-mono text-[11px] text-slate-600"
          >
            {instruction.type}({instruction.target})
          </li>
        ))}
      </ul>
    </div>
  );
}
