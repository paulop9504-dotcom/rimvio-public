"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { InboxVitalityModal } from "@/components/action-chat/inbox-vitality-modal";
import { classifyInboxItemWithVitality } from "@/lib/home/inbox-classifier";
import { listPendingInboxItems, type InboxItem } from "@/lib/home/inbox-store";
import type { VitalityTag } from "@/lib/vitality/types";
import type { LinkRow } from "@/types/database";

type HomeInboxSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: LinkRow[];
  onOpenLink?: (linkId: string) => void;
};

export function HomeInboxSheet({
  open,
  onOpenChange,
  links,
  onOpenLink,
}: HomeInboxSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [classifyTarget, setClassifyTarget] = useState<InboxItem | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setItems(listPendingInboxItems());
    }
  }, [open]);

  const handleClassify = (tag: VitalityTag) => {
    if (!classifyTarget) {
      return;
    }
    try {
      const result = classifyInboxItemWithVitality({
        inboxItemId: classifyTarget.id,
        vitalityTag: tag,
      });
      toast("분류 완료", {
        description: `${result.containerTitle} · ${tag}`,
      });
      setItems(listPendingInboxItems());
      setClassifyTarget(null);
    } catch {
      toast.error("분류에 실패했어요");
    }
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
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
              aria-label="분류 대기"
              className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(70vh,520px)] max-w-lg flex-col rounded-t-[24px] border border-border bg-rimvio-surface shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-[17px] font-bold text-foreground">INBOX</h2>
                  <p className="text-[12px] text-muted-foreground">
                    수신함 · Vitality 분류 · {items.length}건
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full bg-rimvio-surface-muted"
                >
                  <X className="size-5" />
                </button>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {items.length === 0 ? (
                  <li className="py-8 text-center text-[13px] text-muted-foreground">
                    분류 대기 중인 항목이 없어요
                  </li>
                ) : (
                  items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setClassifyTarget(item)}
                        className="mb-2 w-full rounded-2xl border border-border bg-rimvio-surface-muted p-3 text-left transition-colors hover:border-rimvio-neon-purple/30 hover:bg-rimvio-surface"
                      >
                        <p className="text-[14px] font-medium text-foreground">{item.preview}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          confidence {(item.confidence * 100).toFixed(0)}% · 탭해서 분류
                        </p>
                        {item.linkId ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenLink?.(item.linkId!);
                              onOpenChange(false);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.stopPropagation();
                                onOpenLink?.(item.linkId!);
                                onOpenChange(false);
                              }
                            }}
                            className="mt-2 inline-block rounded-xl bg-foreground px-3 py-1.5 text-[12px] font-semibold text-background"
                          >
                            링크 열기
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <InboxVitalityModal
        open={Boolean(classifyTarget)}
        preview={classifyTarget?.preview ?? ""}
        onClose={() => setClassifyTarget(null)}
        onSelect={handleClassify}
      />
    </>,
    document.body
  );
}

