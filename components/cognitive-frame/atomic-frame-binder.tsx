"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ingestFrame } from "@/lib/react-atomic-frame-binder/frame-binder-store";
import type { CognitiveFrame } from "@/lib/react-atomic-frame-binder/types";
import {
  createFrameBinderState,
  type FrameBinderState,
} from "@/lib/react-atomic-frame-binder/frame-binder-store";

type AtomicFrameBinderContextValue = {
  state: FrameBinderState;
  pushFrame: (frame: CognitiveFrame) => void;
};

const AtomicFrameBinderContext = createContext<AtomicFrameBinderContextValue | null>(null);

export type AtomicFrameBinderProviderProps = {
  children: ReactNode;
  batchWithAnimationFrame?: boolean;
};

export function AtomicFrameBinderProvider({
  children,
  batchWithAnimationFrame = true,
}: AtomicFrameBinderProviderProps) {
  const [state, setState] = useState<FrameBinderState>(() => createFrameBinderState());
  const pendingFrameRef = useRef<CognitiveFrame | null>(null);
  const rafRef = useRef<number | null>(null);

  const commitFrame = useCallback((frame: CognitiveFrame) => {
    setState((previous) => ingestFrame(previous, frame));
  }, []);

  const pushFrame = useCallback(
    (frame: CognitiveFrame) => {
      if (!batchWithAnimationFrame) {
        commitFrame(frame);
        return;
      }

      pendingFrameRef.current = frame;
      if (rafRef.current != null) {
        return;
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pending = pendingFrameRef.current;
        pendingFrameRef.current = null;
        if (pending) {
          commitFrame(pending);
        }
      });
    },
    [batchWithAnimationFrame, commitFrame]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      state,
      pushFrame,
    }),
    [state, pushFrame]
  );

  return (
    <AtomicFrameBinderContext.Provider value={value}>{children}</AtomicFrameBinderContext.Provider>
  );
}

export function useAtomicFrameBinder(): AtomicFrameBinderContextValue {
  const context = useContext(AtomicFrameBinderContext);
  if (!context) {
    throw new Error("useAtomicFrameBinder must be used within AtomicFrameBinderProvider");
  }
  return context;
}

export function useCommittedUiState() {
  return useAtomicFrameBinder().state.uiState;
}

export function usePushCognitiveFrame() {
  return useAtomicFrameBinder().pushFrame;
}

export type CognitiveFrameRendererProps = {
  children?: ReactNode;
};

export const CognitiveFrameRenderer = memo(function CognitiveFrameRenderer({
  children,
}: CognitiveFrameRendererProps) {
  const { state } = useAtomicFrameBinder();

  return (
    <div
      data-cognitive-frame-root
      data-tick-id={state.tickId ?? undefined}
      data-frame-revision={state.revision}
    >
      {children}
    </div>
  );
});
