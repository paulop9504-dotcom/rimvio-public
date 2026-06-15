"use client";

import { useCallback, useRef, useState } from "react";

const DRAG_EXPAND_THRESHOLD_PX = 36;
const DRAG_COLLAPSE_THRESHOLD_PX = 28;

export type FeedQueueSheetSnap = {
  expanded: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  handlePointerDown: (clientY: number) => void;
  handlePointerMove: (clientY: number) => void;
  handlePointerUp: () => void;
};

export function useFeedQueueSheetSnap(initialExpanded = false): FeedQueueSheetSnap {
  const [expanded, setExpanded] = useState(initialExpanded);
  const dragStartY = useRef<number | null>(null);
  const dragged = useRef(false);

  const toggle = useCallback(() => {
    setExpanded((value) => !value);
  }, []);

  const expand = useCallback(() => {
    setExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  const handlePointerDown = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    dragged.current = false;
  }, []);

  const handlePointerMove = useCallback((clientY: number) => {
    if (dragStartY.current === null) {
      return;
    }
    const delta = dragStartY.current - clientY;
    if (Math.abs(delta) < 6) {
      return;
    }
    dragged.current = true;
    if (delta > DRAG_EXPAND_THRESHOLD_PX) {
      setExpanded(true);
      dragStartY.current = clientY;
    } else if (delta < -DRAG_COLLAPSE_THRESHOLD_PX) {
      setExpanded(false);
      dragStartY.current = clientY;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    dragStartY.current = null;
  }, []);

  return {
    expanded,
    toggle,
    expand,
    collapse,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
