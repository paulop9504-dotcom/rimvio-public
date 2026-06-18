"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { VITALITY_PRESETS, type VitalityTag } from "@/lib/vitality/types";
import { cn } from "@/lib/utils";

type InboxVitalityModalProps = {
  open: boolean;
  preview: string;
  onClose: () => void;
  onSelect: (tag: VitalityTag) => void;
};

const TAG_ACCENT: Record<VitalityTag, string> = {
  Apex: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  Haven: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  Nexus: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
  Sentinel: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
};

export function InboxVitalityModal({
  open,
  preview,
  onClose,
  onSelect,
}: InboxVitalityModalProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="?�기"
            className="fixed inset-0 z-[90] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Vitality 분류"
            className="fixed inset-x-4 top-[18%] z-[91] mx-auto max-w-md rounded-3xl border border-black/5 bg-rimvio-surface p-5 shadow-2xl"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-foreground">?�디???�까??</h3>
                <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{preview}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(VITALITY_PRESETS) as VitalityTag[]).map((tag) => {
                const preset = VITALITY_PRESETS[tag];
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onSelect(tag)}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left transition-colors",
                      TAG_ACCENT[tag]
                    )}
                  >
                    <span className="block text-[13px] font-bold">{tag}</span>
                    <span className="mt-0.5 block text-[11px] opacity-80">{preset.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
