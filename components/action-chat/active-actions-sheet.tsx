"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Link2, X } from "lucide-react";
import { CalendarBoard } from "@/components/action-chat/calendar-board";
import { CalendarGoogleConnectBanner } from "@/components/calendar/calendar-google-connect-banner";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import type { ActionCalendarSheetView } from "@/hooks/use-action-calendar";
import { useCopy } from "@/hooks/use-copy";

type ActiveActionsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: ActionCalendarSheetView;
  contextByMessageId?: Record<string, string>;
  onCancelScheduled: (messageId: string) => void;
  onFireScheduledNow: (messageId: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onCancelLinkReminder?: (linkId: string) => void;
  onOpenLink?: (linkId: string) => void;
  onAddSchedule?: () => void;
  onOpenFullCalendar?: () => void;
};

function ActionButtons({
  entry,
  onCancelScheduled,
  onFireScheduledNow,
  onScrollToMessage,
  onCancelLinkReminder,
  onOpenLink,
  onClose,
}: {
  entry: ActiveActionEntry;
  onCancelScheduled: (messageId: string) => void;
  onFireScheduledNow: (messageId: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onCancelLinkReminder?: (linkId: string) => void;
  onOpenLink?: (linkId: string) => void;
  onClose: () => void;
}) {
  if (entry.kind === "projected_event") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-[#4285F4] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#3367D6]"
        >
          {entry.countdownLabel ?? "행동 실행"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entry.kind === "scheduled_nav" && entry.messageId ? (
        <>
          <MainActionButton
            label="길찾기"
            brand={resolveMainActionBrandStyle({ label: "카카오맵", type: "NAVIGATE" })}
            compact
            rounded="lg"
            className="w-auto"
            onClick={() => onFireScheduledNow(entry.messageId!)}
          />
          <button
            type="button"
            onClick={() => {
              onScrollToMessage(entry.messageId!);
              onClose();
            }}
            className="rounded-lg bg-rimvio-surface/10 px-3 py-1.5 text-[12px] font-semibold text-[#E5E7EB] hover:bg-rimvio-surface/15"
          >
            일정 수정
          </button>
          <button
            type="button"
            onClick={() => onCancelScheduled(entry.messageId!)}
            className="rounded-lg border border-[#FCA5A5]/40 bg-[#FEF2F2]/10 px-3 py-1.5 text-[12px] font-semibold text-[#FCA5A5]"
          >
            예약 취소
          </button>
        </>
      ) : null}

      {entry.kind === "pending_confirm" && entry.messageId ? (
        <button
          type="button"
          onClick={() => {
            onScrollToMessage(entry.messageId!);
            onClose();
          }}
          className="rounded-lg bg-[#4285F4] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#3367D6]"
        >
          확인하기
        </button>
      ) : null}

      {entry.kind === "study_focus" && entry.messageId ? (
        <button
          type="button"
          onClick={() => {
            onScrollToMessage(entry.messageId!);
            onClose();
          }}
          className="rounded-lg bg-[#4285F4] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#3367D6]"
        >
          공부 이어가기
        </button>
      ) : null}

      {entry.kind === "study_focus" && !entry.messageId ? (
        <span className="rounded-lg bg-rimvio-surface/10 px-3 py-1.5 text-[12px] font-semibold text-[#93C5FD]">
          {entry.countdownLabel ?? "집중 진행 중"}
        </span>
      ) : null}

      {entry.kind === "revealed_actions" && entry.messageId ? (
        <button
          type="button"
          onClick={() => {
            onScrollToMessage(entry.messageId!);
            onClose();
          }}
          className="rounded-lg bg-[#4285F4] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#3367D6]"
        >
          액션 열기
        </button>
      ) : null}

      {entry.linkId ? (
        <>
          <button
            type="button"
            onClick={() => {
              onOpenLink?.(entry.linkId!);
              onClose();
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-rimvio-surface/10 px-3 py-1.5 text-[12px] font-semibold text-[#E5E7EB] hover:bg-rimvio-surface/15"
          >
            <Link2 className="size-3.5" />
            링크 열기
          </button>
          {entry.kind === "link_reminder" ? (
            <button
              type="button"
              onClick={() => onCancelLinkReminder?.(entry.linkId!)}
              className="rounded-lg border border-[#FCA5A5]/40 bg-[#FEF2F2]/10 px-3 py-1.5 text-[12px] font-semibold text-[#FCA5A5]"
            >
              알림 끄기
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function ActiveActionsSheet({
  open,
  onOpenChange,
  calendar,
  contextByMessageId,
  onCancelScheduled,
  onFireScheduledNow,
  onScrollToMessage,
  onCancelLinkReminder,
  onOpenLink,
  onAddSchedule,
  onOpenFullCalendar,
}: ActiveActionsSheetProps) {
  const copy = useCopy();
  const [mounted, setMounted] = useState(false);
  const { overlayRows, attachedActionCount, rowCount } = calendar;

  useEffect(() => {
    setMounted(true);
  }, []);

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
            className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label={copy.nav.calendar}
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(88vh,760px)] max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-border bg-card shadow-[0_-8px_32px_rgba(0,0,0,0.08)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 pb-3 pt-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-foreground">
                    {copy.nav.calendar}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {rowCount > 0
                      ? copy.calendar.sheetSummary(rowCount, attachedActionCount)
                      : copy.calendar.sheetSummaryEmpty}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
              <CalendarToolbar
                variant="sheet"
                showLegend
                showFullScreenLink
                onOpenFullScreen={() => {
                  onOpenChange(false);
                  onOpenFullCalendar?.();
                }}
                className="mb-2 shrink-0"
              />

              <CalendarGoogleConnectBanner className="mb-2 shrink-0" />

              <CalendarBoard
                variant="full"
                defaultView="month"
                overlayRows={overlayRows}
                contextByMessageId={contextByMessageId}
                hideOriginLegend
                showEmptyActions
                className="min-h-0 flex-1"
                onAddSchedule={() => {
                  onOpenChange(false);
                  onAddSchedule?.();
                }}
                renderStreamAction={(entry) => (
                  <ActionButtons
                    entry={entry}
                    onCancelScheduled={onCancelScheduled}
                    onFireScheduledNow={onFireScheduledNow}
                    onScrollToMessage={onScrollToMessage}
                    onCancelLinkReminder={onCancelLinkReminder}
                    onOpenLink={onOpenLink}
                    onClose={() => onOpenChange(false)}
                  />
                )}
              />
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
