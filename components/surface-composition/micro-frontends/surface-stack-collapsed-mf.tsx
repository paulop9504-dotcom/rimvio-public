"use client";

import { memo } from "react";
import { PrimarySurfaceMf } from "@/components/surface-composition/micro-frontends/primary-surface-mf";
import type { PrimarySurfaceMfProps } from "@/components/surface-composition/micro-frontends/primary-surface-mf";

/** OVERLOADED — one primary CTA; peers are titles only (no competing actions). */
export const SurfaceStackCollapsedMf = memo(function SurfaceStackCollapsedMf(
  props: PrimarySurfaceMfProps,
) {
  const peers = props.node.stackPeers ?? [];
  return (
    <div data-surface-stack="collapsed">
      <PrimarySurfaceMf node={props.node} onDispatch={props.onDispatch} />
      {peers.length > 0 ? (
        <ul className="mt-2 space-y-1 rounded-xl border border-black/[0.05] bg-black/[0.02] px-3 py-2">
          {peers.map((peer) => (
            <li
              key={peer.id}
              className="text-[12px] text-rimvio-ink/55"
              data-surface-stack-peer={peer.id}
            >
              {peer.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
