"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { hasSeenGestureCoach, markGestureCoachSeen } from "@/lib/local-links/gesture-coach";
import { cn } from "@/lib/utils";
import { IOS } from "@/lib/ui/ios-surface";

const STEPS = [
  { icon: "↑↓", title: "위아래로 넘기기", body: "다음 링크 · 이전 링크" },
  { icon: "←", title: "왼쪽으로 밀기", body: "함께하기 방에 추가 (피드는 계속)" },
  { icon: "→", title: "오른쪽으로 밀기", body: "피드에서 삭제 (3초 안 되돌리기)" },
  { icon: "↔", title: "비슷한 링크", body: "카드 아래에서 옆으로 밀어 보기" },
] as const;

export function FeedGestureCoach() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hasSeenGestureCoach()) {
      const timer = window.setTimeout(() => setOpen(true), 900);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    markGestureCoachSeen();
    setOpen(false);
  };

  const next = () => {
    if (step >= STEPS.length - 1) {
      dismiss();
      return;
    }

    setStep((value) => value + 1);
  };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="gesture-coach"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal
          aria-labelledby="gesture-coach-title"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className={cn("w-full max-w-md p-5", IOS.card)}
          >
            <p className={IOS.sectionLabel}>피드 사용법</p>
            <div className="mt-4 flex items-start gap-4">
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#f2f2f7] text-2xl font-semibold text-[#007AFF]"
                aria-hidden
              >
                {current.icon}
              </span>
              <div className="min-w-0 pt-1">
                <h2
                  id="gesture-coach-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  {current.title}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {current.body}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-1.5">
              {STEPS.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "rounded-full transition-all",
                    index === step
                      ? "size-2 bg-[#007AFF]"
                      : "size-1.5 bg-black/15"
                  )}
                />
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={dismiss}
                className={cn(
                  "flex-1 py-3 text-center text-[15px] font-medium",
                  IOS.secondaryBtn
                )}
              >
                건너뛰기
              </button>
              <button
                type="button"
                onClick={next}
                className={cn("flex-1", IOS.primaryBtn, "h-12")}
              >
                {step >= STEPS.length - 1 ? "시작하기" : "다음"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
