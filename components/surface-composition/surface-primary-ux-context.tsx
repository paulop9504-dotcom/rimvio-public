"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SurfaceActionFeedback } from "@/hooks/use-surface-action-feedback";

export type SurfacePrimaryUxValue = {
  whyLine: string | null;
  getFeedback: (actionKey: string) => SurfaceActionFeedback;
};

const SurfacePrimaryUxContext = createContext<SurfacePrimaryUxValue | null>(null);

export function SurfacePrimaryUxProvider({
  value,
  children,
}: {
  value: SurfacePrimaryUxValue;
  children: ReactNode;
}) {
  return (
    <SurfacePrimaryUxContext.Provider value={value}>{children}</SurfacePrimaryUxContext.Provider>
  );
}

export function useSurfacePrimaryUx(): SurfacePrimaryUxValue | null {
  return useContext(SurfacePrimaryUxContext);
}
