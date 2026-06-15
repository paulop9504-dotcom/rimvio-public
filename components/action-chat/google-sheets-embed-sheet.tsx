"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Loader2, Sheet, X } from "lucide-react";
import {
  buildGoogleSheetsOpenUrl,
  resolveGoogleSheetsEmbed,
} from "@/lib/integrations/google-sheets-embed";
import { cn } from "@/lib/utils";

export type GoogleSheetsEmbedTarget = {
  url: string;
  title?: string;
};

type GoogleSheetsEmbedSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: GoogleSheetsEmbedTarget | null;
};

const LOAD_HINT_MS = 7000;

export function GoogleSheetsEmbedSheet({
  open,
  onOpenChange,
  target,
}: GoogleSheetsEmbedSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [frameLoading, setFrameLoading] = useState(true);
  const [showLoadHint, setShowLoadHint] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setFrameLoading(true);
      setShowLoadHint(false);
    }
  }, [open, target?.url]);

  useEffect(() => {
    if (!open || !frameLoading) {
      return;
    }
    const timer = window.setTimeout(() => setShowLoadHint(true), LOAD_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [open, frameLoading, target?.url]);

  const resolved = useMemo(() => {
    if (!target?.url) {
      return null;
    }
    // Logged-in Google sessions break out of iframe on /htmlembed — preview only in-app.
    return resolveGoogleSheetsEmbed(target.url, "preview");
  }, [target?.url]);

  const openUrl = target?.url ? buildGoogleSheetsOpenUrl(target.url) : "";

  const openInGoogleSheets = () => {
    if (!openUrl) {
      return;
    }
    window.open(openUrl, "_blank", "noopener,noreferrer");
  };

  if (!mounted) {
    return null;
  }

  const title = target?.title?.trim() || "Google Sheets";

  return createPortal(
    <AnimatePresence>
      {open && target && resolved ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[90] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-[91] mx-auto flex h-[min(88vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#1F2937] shadow-[0_-12px_40px_rgba(0,0,0,0.4)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#30D158]/15 text-[#86EFAC]">
                  <Sheet className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#F3F4F6]">{title}</p>
                  <p className="truncate text-[11px] text-[#9CA3AF]">Google Sheets · 앱에서 미리보기</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="mr-1 flex rounded-lg border border-white/10 p-0.5">
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-semibold",
                      "bg-[#32D7FF]/20 text-[#7DD3FC]",
                    )}
                  >
                    보기
                  </span>
                  <button
                    type="button"
                    onClick={openInGoogleSheets}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold text-[#9CA3AF] transition hover:bg-white/5 hover:text-[#E5E7EB]"
                  >
                    편집
                  </button>
                </div>
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-white/5"
                  aria-label="새 탭에서 열기"
                >
                  <ExternalLink className="size-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-8 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-white/5"
                  aria-label="닫기"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="shrink-0 border-b border-white/[0.06] bg-[#111827] px-4 py-2.5">
              <button
                type="button"
                onClick={openInGoogleSheets}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#32D7FF]/35 bg-[#32D7FF]/10 px-3 py-2.5 text-[12px] font-semibold text-[#7DD3FC] transition hover:bg-[#32D7FF]/18"
              >
                <ExternalLink className="size-4 shrink-0" />
                Google Sheets에서 편집하기
              </button>
            </div>

            <div className="relative min-h-0 flex-1 bg-white">
              {frameLoading ? (
                <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3 bg-[#111827]">
                  <Loader2 className="size-6 animate-spin text-rimvio-neon-cyan" />
                  <p className="text-[11px] text-[#9CA3AF]">시트 불러오는 중…</p>
                </div>
              ) : null}
              {showLoadHint ? (
                <div className="absolute inset-x-4 top-4 z-[3] rounded-xl border border-[#FFD60A]/35 bg-[#1F2937]/95 px-3 py-2.5 text-center shadow-lg backdrop-blur-sm">
                  <p className="text-[11px] leading-relaxed text-[#E5E7EB]">
                    화면이 비어 있으면 시트 공유를 「링크가 있는 모든 사용자 · 뷰어」 이상으로
                    바꾸거나 위 버튼으로 Google에서 열어 주세요.
                  </p>
                </div>
              ) : null}
              <iframe
                key={resolved.embedUrl}
                title={title}
                src={resolved.embedUrl}
                className="absolute inset-0 h-full w-full border-0 bg-white"
                allow="clipboard-read; clipboard-write; fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setFrameLoading(false)}
              />
            </div>

            <p className="shrink-0 border-t border-white/[0.06] px-4 py-2 text-[10px] leading-relaxed text-[#6B7280]">
              앱 안에서는 미리보기만 가능해요 · 편집은 Google Sheets(새 탭·앱)에서 열려요.
            </p>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
