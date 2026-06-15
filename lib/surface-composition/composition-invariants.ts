import type { CompositionLayout } from "@/lib/surface-composition/surface-node-contract";

export function assertCompositionInvariants(layout: CompositionLayout): void {
  if (!layout.primary && layout.secondary.length === 0) {
    throw new Error("Composition invariant: empty layout");
  }
  const primaryCtAs = layout.primary ? 1 : 0;
  if (primaryCtAs > 1) {
    throw new Error("Composition invariant: multiple primary slots");
  }
  if (layout.secondary.length > 0) {
    throw new Error("Composition invariant: secondary slots must be latent-only (0 visible)");
  }
}
