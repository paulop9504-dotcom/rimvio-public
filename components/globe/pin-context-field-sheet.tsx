"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { cn } from "@/lib/utils";

export type PinContextFieldKind = "place" | "title" | "note";

const FIELD_COPY: Record<
  PinContextFieldKind,
  { label: string; placeholder: string; hint: string; multiline?: boolean }
> = {
  place: {
    label: "장소",
    placeholder: "예: 둔산동 스타벅스",
    hint: "지구·지도에 보이는 이름이에요",
  },
  title: {
    label: "경험 제목",
    placeholder: "예: 민수 결혼식",
    hint: "핀을 열면 가장 먼저 보이는 이름",
  },
  note: {
    label: "한 줄 메모",
    placeholder: "예: 여기서 점심 먹음",
    hint: "친구와 함께 기억할 메모",
    multiline: true,
  },
};

export type PinContextFieldSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PinContextFieldKind;
  value: string;
  onSave: (next: string) => Promise<void>;
};

/** One field, one tap — pin context edit mini sheet. */
export function PinContextFieldSheet({
  open,
  onOpenChange,
  kind,
  value,
  onSave,
}: PinContextFieldSheetProps) {
  const inputId = useId();
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const copy = FIELD_COPY[kind];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    if (trimmed === value.trim()) {
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      await onSave(trimmed);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[92] bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={inputId}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[93] mx-auto w-full max-w-lg rounded-t-[1.25rem] border border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl"
            data-pin-context-field-sheet
            data-pin-context-field={kind}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p id={inputId} className="text-[16px] font-semibold text-foreground">
                  {copy.label} 고치기
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{copy.hint}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full active:bg-muted"
                aria-label="닫기"
              >
                <X className="size-5 text-muted-foreground" aria-hidden />
              </button>
            </div>

            {copy.multiline ? (
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={copy.placeholder}
                rows={3}
                className={cn(
                  "w-full resize-none rounded-2xl border border-border bg-muted/60 px-4 py-3",
                  "text-[15px] text-foreground outline-none ring-primary/30 focus:ring-2",
                )}
                autoFocus
              />
            ) : (
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={copy.placeholder}
                className={cn(
                  "w-full rounded-2xl border border-border bg-muted/60 px-4 py-3.5",
                  "text-[15px] text-foreground outline-none ring-primary/30 focus:ring-2",
                )}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSave();
                  }
                }}
              />
            )}

            <MainActionButton
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => void handleSave()}
              className="mt-3 w-full"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  저장 중…
                </span>
              ) : (
                "저장"
              )}
            </MainActionButton>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
