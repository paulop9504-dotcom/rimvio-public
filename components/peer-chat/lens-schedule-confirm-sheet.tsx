"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Calendar, MapPin, Sparkles, User, X } from "lucide-react";
import { commitLensScheduleFromConfirm } from "@/lib/peer-chat/ai-lens/commit-schedule-from-lens";
import { detectScheduleConflict } from "@/lib/peer-chat/ai-lens/detect-schedule-conflict";
import type { ScheduleConfirmDraft } from "@/lib/peer-chat/ai-lens/prepare-schedule-confirm";
import {
  combineScheduleEditFields,
  formatScheduleConfirmWhen,
  parseScheduleEditFields,
} from "@/lib/peer-chat/ai-lens/resolve-schedule-datetime";
import { mergePlanContextEdits } from "@/lib/plan-context/build-plan-context-draft";
import { computeWindowEndFromNights } from "@/lib/plan-context/extract-plan-window";
import { formatPlanWindowLabel } from "@/lib/plan-context/format-plan-window-label";
import type { PlanAttachMode } from "@/lib/plan-context/plan-context-types";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { resolveTripPrepRecall } from "@/lib/plan-context/resolve-trip-prep-recall";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LensScheduleConfirmSheetProps = {
  open: boolean;
  draft: ScheduleConfirmDraft | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: (message: string) => void;
};

const FIELD_INPUT_CLASS =
  "mt-1 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-[14px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-violet-400/50 focus:ring-1 focus:ring-violet-400/25 [color-scheme:dark]";

const NIGHT_PRESETS = [
  { label: "1박2일", nights: 1 },
  { label: "2박3일", nights: 2 },
  { label: "3박4일", nights: 3 },
] as const;

function confirmButtonLabel(
  conflictKind: ScheduleConfirmDraft["conflict"]["kind"],
  attachMode: PlanAttachMode,
): string {
  if (attachMode === "continue") {
    return "계획에 이어서 저장";
  }
  if (conflictKind === "duplicate") {
    return "그래도 저장";
  }
  if (conflictKind === "overlap") {
    return "겹쳐도 저장";
  }
  return "캘린더에 저장";
}

export function LensScheduleConfirmSheet({
  open,
  draft,
  onOpenChange,
  onSaved,
}: LensScheduleConfirmSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [promoteToFeed, setPromoteToFeed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("12:00");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPlace, setEditPlace] = useState("");
  const [attachMode, setAttachMode] = useState<PlanAttachMode>("new");
  const [windowConfidence, setWindowConfidence] = useState<
    "confirmed" | "estimated" | "open"
  >("open");
  const [nights, setNights] = useState<number | undefined>();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && draft) {
      const fields = parseScheduleEditFields(draft.datetimeIso);
      setEditDate(fields.date);
      setEditTime(fields.time);
      setEditPlace(draft.place ?? "");
      setPromoteToFeed(draft.feedOptInDefault);
      setAttachMode(draft.planAttach.canContinue ? draft.planContext.attachMode : "new");

      const endFields = draft.planContext.windowEndIso
        ? parseScheduleEditFields(draft.planContext.windowEndIso)
        : null;
      setEditEndDate(endFields?.date ?? "");
      setWindowConfidence(draft.planContext.windowConfidence);
      setNights(draft.planContext.nights);
    }
  }, [open, draft]);

  const editedDatetimeIso = useMemo(
    () => combineScheduleEditFields(editDate, editTime),
    [editDate, editTime],
  );

  const editedWindowEndIso = useMemo(() => {
    if (!editEndDate.trim()) {
      return null;
    }
    return combineScheduleEditFields(editEndDate, "12:00") ?? null;
  }, [editEndDate]);

  const liveConflict = useMemo(() => {
    if (!draft) {
      return null;
    }
    return detectScheduleConflict({
      title: draft.title,
      datetime: editedDatetimeIso,
      sourceMessageId: draft.sourceMessageId,
      events: listLifeEventCandidates(),
    });
  }, [draft, editedDatetimeIso]);

  const windowLabel = useMemo(
    () =>
      formatPlanWindowLabel({
        windowStartIso: editedDatetimeIso,
        windowEndIso: editedWindowEndIso,
        nights,
        windowConfidence,
      }),
    [editedDatetimeIso, editedWindowEndIso, nights, windowConfidence],
  );

  const tripPrepRecall = useMemo(() => {
    if (!draft) {
      return null;
    }
    return resolveTripPrepRecall({
      title: draft.title,
      place: editPlace.trim() || draft.place,
      peerDisplayName: draft.peerDisplayName,
      events: listLifeEventCandidates(),
      excludeEventId:
        attachMode === "continue" ? draft.planAttach.candidatePlanId : null,
    });
  }, [draft, editPlace, attachMode]);

  if (!mounted) {
    return null;
  }

  const conflict = liveConflict ?? draft?.conflict;
  const showFeedOption = draft?.intent.suggestFeed ?? false;
  const whenPreview = formatScheduleConfirmWhen(editedDatetimeIso);
  const showPlanWindow = draft?.intent.kind === "plan" || draft?.planAttach.canContinue;

  const applyNightPreset = (nightCount: number) => {
    if (!editedDatetimeIso) {
      toast.error("시작 날짜를 먼저 선택해 주세요");
      return;
    }
    const endIso = computeWindowEndFromNights(editedDatetimeIso, nightCount);
    if (!endIso) {
      return;
    }
    setNights(nightCount);
    setWindowConfidence("estimated");
    setEditEndDate(parseScheduleEditFields(endIso).date);
  };

  const clearEndWindow = () => {
    setEditEndDate("");
    setNights(undefined);
    setWindowConfidence("open");
  };

  const handleSave = () => {
    if (!draft || saving) {
      return;
    }
    if (!editDate.trim()) {
      toast.error("날짜를 선택해 주세요");
      return;
    }

    const planContext = mergePlanContextEdits(draft.planContext, {
      windowStartIso: editedDatetimeIso,
      windowEndIso: editedWindowEndIso,
      nights,
      windowConfidence: editedWindowEndIso ? windowConfidence : "open",
      place: editPlace.trim() || null,
      attachMode,
      planId:
        attachMode === "continue" ? draft.planAttach.candidatePlanId : undefined,
    });

    setSaving(true);
    const result = commitLensScheduleFromConfirm({
      candidate: draft.candidate,
      sourceMessageId: draft.sourceMessageId,
      peerDisplayName: draft.peerDisplayName,
      promoteToFeed: promoteToFeed && showFeedOption,
      intent: draft.intent,
      datetimeIso: editedDatetimeIso,
      title: draft.title,
      place: editPlace.trim() || undefined,
      planContext,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    onOpenChange(false);
    onSaved?.(result.message);
  };

  return createPortal(
    <AnimatePresence>
      {open && draft ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px]"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lens-schedule-sheet-title"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-h-[min(88vh,720px)] max-w-lg overflow-y-auto rounded-t-[1.35rem] border border-white/10 bg-[#1a1a1c] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-cyan-300/90">
                  <Sparkles className="size-3.5" aria-hidden />
                  <span className="text-[11px] font-semibold tracking-wide">맥락 확인</span>
                </div>
                <p
                  id="lens-schedule-sheet-title"
                  className="mt-1 text-[17px] font-semibold leading-snug text-white"
                >
                  {draft.title}
                </p>
                {windowLabel ? (
                  <p className="mt-1 text-[12px] font-medium text-violet-200/80">{windowLabel}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>

            {tripPrepRecall ? (
              <Link
                href={tripPrepRecall.feedHref}
                className="mb-3 block rounded-2xl bg-violet-500/10 px-3.5 py-3 ring-1 ring-violet-400/25 transition-colors hover:bg-violet-500/15"
                onClick={() => onOpenChange(false)}
              >
                <p className="text-[11px] font-semibold tracking-wide text-violet-200/80">
                  추억 회상
                </p>
                <p className="mt-1 text-[13px] font-medium leading-snug text-white/90">
                  {tripPrepRecall.recallLine}
                </p>
                <p className="mt-1 truncate text-[12px] text-white/50">
                  {tripPrepRecall.hit.headline}
                  {tripPrepRecall.hit.timeLabel
                    ? ` · ${tripPrepRecall.hit.timeLabel}`
                    : ""}
                </p>
              </Link>
            ) : null}

            {draft.planAttach.canContinue ? (
              <div className="mb-3 rounded-2xl bg-emerald-500/10 px-3.5 py-3 ring-1 ring-emerald-400/25">
                <p className="text-[13px] font-semibold text-white/92">{draft.planAttach.headline}</p>
                {draft.planAttach.detail ? (
                  <p className="mt-0.5 text-[12px] text-white/55">{draft.planAttach.detail}</p>
                ) : null}
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAttachMode("continue")}
                    className={cn(
                      "flex-1 rounded-xl py-2 text-[12px] font-semibold ring-1 transition-colors",
                      attachMode === "continue"
                        ? "bg-emerald-500/25 text-white ring-emerald-300/40"
                        : "bg-white/5 text-white/65 ring-white/10",
                    )}
                  >
                    이어가기
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachMode("new")}
                    className={cn(
                      "flex-1 rounded-xl py-2 text-[12px] font-semibold ring-1 transition-colors",
                      attachMode === "new"
                        ? "bg-white/12 text-white ring-white/20"
                        : "bg-white/5 text-white/65 ring-white/10",
                    )}
                  >
                    새로 만들기
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-3 rounded-2xl bg-white/[0.04] px-3.5 py-3 ring-1 ring-white/8">
              <div className="flex items-start gap-2.5">
                <Calendar className="mt-2 size-4 shrink-0 text-violet-300/90" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-white/45">시작</p>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <label className="min-w-0">
                      <span className="sr-only">날짜</span>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(event) => setEditDate(event.target.value)}
                        className={FIELD_INPUT_CLASS}
                        aria-label="시작 날짜"
                      />
                    </label>
                    <label className="min-w-0">
                      <span className="sr-only">시간</span>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(event) => setEditTime(event.target.value)}
                        className={FIELD_INPUT_CLASS}
                        aria-label="시작 시간"
                      />
                    </label>
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/40">{whenPreview}</p>
                </div>
              </div>

              {showPlanWindow ? (
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-2 size-4 shrink-0 text-amber-300/90" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/45">종료 · 기간</p>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(event) => {
                        setEditEndDate(event.target.value);
                        setWindowConfidence("confirmed");
                        setNights(undefined);
                      }}
                      className={FIELD_INPUT_CLASS}
                      aria-label="종료 날짜"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {NIGHT_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyNightPreset(preset.nights)}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors",
                            nights === preset.nights
                              ? "bg-amber-500/20 text-amber-100 ring-amber-300/35"
                              : "bg-white/5 text-white/70 ring-white/10",
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={clearEndWindow}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors",
                          !editEndDate
                            ? "bg-white/12 text-white ring-white/15"
                            : "bg-white/5 text-white/55 ring-white/10",
                        )}
                      >
                        미정
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-2.5">
                <MapPin className="mt-2 size-4 shrink-0 text-sky-300/90" aria-hidden />
                <div className="min-w-0 flex-1">
                  <label className="block">
                    <span className="text-[11px] text-white/45">어디</span>
                    <input
                      type="text"
                      value={editPlace}
                      onChange={(event) => setEditPlace(event.target.value)}
                      placeholder="장소·지역 입력"
                      className={FIELD_INPUT_CLASS}
                      aria-label="장소"
                    />
                  </label>
                </div>
              </div>

              {draft.peerDisplayName ? (
                <div className="flex items-start gap-2.5">
                  <User className="mt-0.5 size-4 shrink-0 text-emerald-300/90" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/45">함께</p>
                    <p className="text-[14px] font-medium text-white/92">{draft.peerDisplayName}</p>
                  </div>
                </div>
              ) : null}
            </div>

            {conflict && conflict.kind !== "none" && attachMode !== "continue" ? (
              <div
                className={cn(
                  "mt-3 flex gap-2.5 rounded-2xl px-3.5 py-3 ring-1",
                  conflict.kind === "duplicate"
                    ? "bg-amber-500/10 ring-amber-400/25"
                    : "bg-orange-500/10 ring-orange-400/25",
                )}
              >
                <AlertTriangle
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    conflict.kind === "duplicate" ? "text-amber-300" : "text-orange-300",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white/92">{conflict.headline}</p>
                  {conflict.detail ? (
                    <p className="mt-0.5 text-[12px] text-white/60">{conflict.detail}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {showFeedOption ? (
              <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl bg-cyan-500/8 px-3.5 py-3 ring-1 ring-cyan-400/20">
                <input
                  type="checkbox"
                  checked={promoteToFeed}
                  onChange={(event) => setPromoteToFeed(event.target.checked)}
                  className="mt-1 size-4 shrink-0 rounded border-white/20 bg-white/10 accent-cyan-400"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-white/90">
                    {draft.intent.feedCheckboxLabel}
                  </span>
                  {draft.intent.feedCheckboxHint ? (
                    <span className="mt-0.5 block text-[11px] leading-snug text-white/50">
                      {draft.intent.feedCheckboxHint}
                    </span>
                  ) : null}
                </span>
              </label>
            ) : (
              <p className="mt-3 px-1 text-[11px] leading-relaxed text-white/40">
                시간·공간·기간을 확인한 뒤 저장하면 맥락이 하나로 묶여요.
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => onOpenChange(false)}
                className="rounded-2xl bg-white/6 py-3.5 text-[14px] font-semibold text-white/75 ring-1 ring-white/10 active:bg-white/10 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-2xl bg-violet-500 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-violet-900/30 active:bg-violet-400 disabled:opacity-50"
              >
                {saving
                  ? "저장 중…"
                  : confirmButtonLabel(conflict?.kind ?? "none", attachMode)}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
