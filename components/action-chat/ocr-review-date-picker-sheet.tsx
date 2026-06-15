"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OcrReviewDatePickerWire } from "@/lib/action-chat/action-oriented-prompt";

type OcrReviewDatePickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: OcrReviewDatePickerWire | null;
  onConfirm: (patches: Array<{ candidateId: string; date: string }>) => void;
};

export function OcrReviewDatePickerSheet({
  open,
  onOpenChange,
  request,
  onConfirm,
}: OcrReviewDatePickerSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [datesById, setDatesById] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !request) {
      return;
    }
    const initial: Record<string, string> = {};
    for (const row of request.rows) {
      initial[row.candidateId] = new Date().toISOString().slice(0, 10);
    }
    setDatesById(initial);
  }, [open, request]);

  if (!mounted || !request) {
    return null;
  }

  const allSelected = request.rows.every(
    (row) => datesById[row.candidateId]?.length === 10
  );

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="?�기"
            className="fixed inset-0 z-[80] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="?�정 ?�짜 ?�택"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-h-[85vh] max-w-lg overflow-y-auto rounded-t-[24px] border border-black/5 bg-rimvio-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#10B981]/12 text-[#10B981]">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#1F2937]">
                    ?�짜 ?�택
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    ?�짜�?모두 고른 ???�인??주세??
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-black/[0.04]"
              >
                <X className="size-4" />
              </button>
            </div>

            <ul className="space-y-3">
              {request.rows.map((row) => (
                <li
                  key={row.candidateId}
                  className="flex items-center gap-3 rounded-xl border border-black/6 bg-[#F9FAFB] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[#1F2937]">
                      {row.title}
                    </p>
                    {row.time ? (
                      <p className="text-[11px] text-muted-foreground">{row.time}</p>
                    ) : null}
                  </div>
                  <input
                    type="date"
                    aria-label={`${row.title} ?�짜`}
                    value={datesById[row.candidateId] ?? ""}
                    onChange={(event) =>
                      setDatesById((prev) => ({
                        ...prev,
                        [row.candidateId]: event.target.value,
                      }))
                    }
                    className="shrink-0 rounded-lg border border-black/8 bg-rimvio-surface px-2 py-1.5 text-[13px] outline-none focus:border-[#10B981]/40"
                  />
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={!allSelected}
              onClick={() => {
                const patches = request.rows.map((row) => ({
                  candidateId: row.candidateId,
                  date: datesById[row.candidateId]!,
                }));
                onConfirm(patches);
                onOpenChange(false);
              }}
              className={cn(
                "rimvio-action-button rimvio-action-button--primary mt-4 w-full",
                !allSelected && "opacity-50"
              )}
            >
              ?�인
            </button>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
