"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionDatePickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftTask?: string;
  referenceDate?: string;
  onConfirm: (input: { date: string; time: string; task: string }) => void;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function ActionDatePickerSheet({
  open,
  onOpenChange,
  draftTask = "일정",
  referenceDate,
  onConfirm,
}: ActionDatePickerSheetProps) {
  const [mounted, setMounted] = useState(false);
  const baseDate = referenceDate ?? new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(baseDate);
  const [time, setTime] = useState("09:00");
  const [task, setTask] = useState(draftTask);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDate(baseDate);
    setTime("09:00");
    setTask(draftTask);
  }, [open, baseDate, draftTask]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[80] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="일정 시간 선택"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-w-lg rounded-t-[24px] border border-black/5 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
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
                  <p className="text-[15px] font-semibold text-[#1F2937]">DatePicker</p>
                  <p className="text-[11px] text-[#6B7280]">시간을 골라 일정을 확정하세요</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-full text-[#6B7280] hover:bg-black/[0.04]"
              >
                <X className="size-4" />
              </button>
            </div>

            <label className="mb-3 block">
              <span className="mb-1 block text-[11px] font-semibold text-[#6B7280]">일정</span>
              <input
                value={task}
                onChange={(event) => setTask(event.target.value)}
                className="w-full rounded-xl border border-black/8 bg-[#F9FAFB] px-3 py-2.5 text-[14px] outline-none focus:border-[#10B981]/40"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[#6B7280]">날짜</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-xl border border-black/8 bg-[#F9FAFB] px-3 py-2.5 text-[14px] outline-none focus:border-[#10B981]/40"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[#6B7280]">시간</span>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="w-full rounded-xl border border-black/8 bg-[#F9FAFB] px-3 py-2.5 text-[14px] outline-none focus:border-[#10B981]/40"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                onConfirm({ date, time, task: task.trim() || draftTask });
                onOpenChange(false);
              }}
              className={cn(
                "rimvio-action-button rimvio-action-button--primary mt-4 w-full"
              )}
            >
              일정 확정
            </button>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDatePickerConfirmLabel(input: {
  date: string;
  time: string;
  task: string;
}) {
  const [hour, minute] = input.time.split(":");
  return `${input.date} ${pad2(Number.parseInt(hour ?? "9", 10))}:${minute ?? "00"} ${input.task}`;
}
