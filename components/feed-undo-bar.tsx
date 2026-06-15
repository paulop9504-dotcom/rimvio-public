"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

const UNDO_MS = 3000;

type FeedUndoBarProps = {
  title: string;
  onUndo: () => void;
  onExpire: () => void;
};

export function FeedUndoBar({ title, onUndo, onExpire }: FeedUndoBarProps) {
  const [progress, setProgress] = useState(1);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const started = performance.now();

    const tick = () => {
      const elapsed = performance.now() - started;
      const remaining = Math.max(0, 1 - elapsed / UNDO_MS);
      setProgress(remaining);

      if (remaining <= 0) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpire();
        }
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    let frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [title, onExpire]);

  const handleUndo = () => {
    expiredRef.current = true;
    onUndo();
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 16, opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "pointer-events-auto fixed inset-x-0 z-50 mx-auto w-full max-w-md",
        "bottom-[max(3.25rem,calc(env(safe-area-inset-bottom)+2.85rem))] px-4"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-2xl bg-foreground text-background shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-xl leading-none" aria-hidden>
            👀
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold tracking-tight">
              방금 삭제했어요
            </p>
            <p className="mt-0.5 truncate text-xs text-background/65">
              {title}
            </p>
          </div>

          <button
            type="button"
            onClick={handleUndo}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full",
              "bg-background px-4 py-2 text-sm font-semibold text-foreground",
              "transition-transform active:scale-[0.97]"
            )}
          >
            <Undo2 className="size-4" strokeWidth={2.25} />
            취소
          </button>
        </div>

        <div className="h-1 bg-background/15">
          <motion.div
            className="h-full origin-left bg-background/85"
            style={{ scaleX: progress }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export { UNDO_MS as FEED_UNDO_MS };
