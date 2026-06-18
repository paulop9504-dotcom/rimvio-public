"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { RimvioActionButton } from "@/components/ui/rimvio-action-button";
import { cn } from "@/lib/utils";

type MagicActionTriggerProps = {
  pulsing?: boolean;
  onClick: () => void;
  className?: string;
  label?: string;
};

export function MagicActionTrigger({
  pulsing = true,
  onClick,
  className,
  label = "액션 보기",
}: MagicActionTriggerProps) {
  return (
    <div className={cn("flex justify-end pt-1", className)}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cn(
          "relative flex size-11 items-center justify-center rounded-full",
          "bg-gradient-to-br from-[#5BA3E8] to-[#4A90E2] text-white",
          "shadow-[0_8px_24px_-8px_rgba(74,144,226,0.55)]",
          "transition-transform active:scale-95",
          pulsing && "animate-magic-pulse"
        )}
      >
        <Sparkles className="size-5" strokeWidth={2.1} />
        {pulsing ? (
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[#7B61FF]/35 animate-ping" />
        ) : null}
      </button>
    </div>
  );
}

type ConfirmRevealButtonProps = {
  onClick: () => void;
  className?: string;
};

export function ConfirmRevealButton({ onClick, className }: ConfirmRevealButtonProps) {
  return (
    <RimvioActionButton
      type="button"
      variant="primary"
      layout="pill"
      onClick={onClick}
      className={className}
    >
      네, 보여주세요
    </RimvioActionButton>
  );
}

type AlternateRevealButtonProps = {
  onClick: () => void;
  className?: string;
};

export function AlternateRevealButton({ onClick, className }: AlternateRevealButtonProps) {
  return (
    <RimvioActionButton
      type="button"
      variant="secondary"
      layout="pill"
      onClick={onClick}
      className={className}
    >
      아니요, 다른 거 보여주세요
    </RimvioActionButton>
  );
}

type ConfirmRevealButtonsProps = {
  onConfirm: () => void;
  onAlternate?: () => void;
  showAlternate?: boolean;
  className?: string;
};

export function ConfirmRevealButtons({
  onConfirm,
  onAlternate,
  showAlternate = false,
  className,
}: ConfirmRevealButtonsProps) {
  return (
    <div className={cn("mt-2 flex flex-wrap gap-2", className)}>
      <ConfirmRevealButton onClick={onConfirm} />
      {showAlternate && onAlternate ? (
        <AlternateRevealButton onClick={onAlternate} />
      ) : null}
    </div>
  );
}

type RevealedActionGridProps = {
  open: boolean;
  children: React.ReactNode;
};

export function RevealedActionGrid({ open, children }: RevealedActionGridProps) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="grid"
          initial={{ opacity: 0, height: 0, y: 8 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: 4 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="pt-1">{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
