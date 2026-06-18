"use client";

import { memo } from "react";
import { PrimaryActionButton } from "@/components/surface-composition/primary-action-button";
import { SurfaceMfShell } from "@/components/surface-composition/micro-frontends/surface-mf-shell";
import { SurfaceWhyLine } from "@/components/surface-composition/surface-why-line";
import { useSurfacePrimaryUx } from "@/components/surface-composition/surface-primary-ux-context";
import { buildSurfaceActionKey } from "@/lib/memory";
import type { SurfaceNode, DispatchSurfaceAction } from "@/lib/surface-composition/surface-node-contract";

export type PrimarySurfaceMfProps = {
  node: SurfaceNode;
  onDispatch: DispatchSurfaceAction;
};

export const PrimarySurfaceMf = memo(function PrimarySurfaceMf({
  node,
  onDispatch,
}: PrimarySurfaceMfProps) {
  const ux = useSurfacePrimaryUx();
  const actionKey = buildSurfaceActionKey(node.id, node.primaryAction.capabilityId);
  const feedback = ux?.getFeedback(actionKey) ?? { phase: "idle" as const };
  const whyLine = ux?.whyLine ?? node.narration?.summary ?? null;

  return (
    <SurfaceMfShell node={node}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-rimvio-ink/40">
        지금 할 일
      </p>
      <header className="mt-1 space-y-1">
        <h3 className="text-[15px] font-semibold text-rimvio-ink">{node.title}</h3>
        {node.description ? (
          <p className="text-[13px] leading-snug text-rimvio-ink/65">{node.description}</p>
        ) : null}
      </header>
      {whyLine ? (
        <div className="mt-2">
          <SurfaceWhyLine line={whyLine} />
        </div>
      ) : null}
      <div className="mt-3">
        <PrimaryActionButton
          action={node.primaryAction}
          phase={feedback.phase}
          statusMessage={feedback.message}
          onPress={() => onDispatch(node, node.primaryAction)}
        />
      </div>
      {node.secondaryActions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {node.secondaryActions.map((action) => (
            <button
              key={action.id}
              type="button"
              data-surface-cta="secondary"
              className="rounded-full border border-black/[0.08] px-3 py-1.5 text-[12px] text-rimvio-ink/80"
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
