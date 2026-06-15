"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Link2, Mic, StickyNote, X } from "lucide-react";
import { ingestScreenshot } from "@/lib/share/ingest-screenshot";
import { ingestPastedLinks } from "@/lib/share/inbox-paste";
import { cn } from "@/lib/utils";

export type CaptureSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CaptureTile = {
  id: "photo" | "link" | "memo" | "voice";
  label: string;
  icon: typeof Camera;
  enabled: boolean;
};

const TILES: CaptureTile[] = [
  { id: "photo", label: "사진", icon: Camera, enabled: true },
  { id: "link", label: "링크", icon: Link2, enabled: true },
  { id: "memo", label: "메모", icon: StickyNote, enabled: true },
  { id: "voice", label: "음성", icon: Mic, enabled: false },
];

/** ➕ tab — input only, no search or AI chat. */
export function CaptureSheet({ open, onOpenChange }: CaptureSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");
  const [linkDraft, setLinkDraft] = useState("");
  const [mode, setMode] = useState<"tiles" | "link" | "memo">("tiles");
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setMode("tiles");
      setMemoDraft("");
      setLinkDraft("");
      setBusy(false);
    }
  }, [open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const onPhotoSelected = useCallback(
    async (file: File | null) => {
      if (!file || busy) {
        return;
      }
      setBusy(true);
      try {
        await ingestScreenshot(file);
        close();
      } catch {
        // ingest handles user-facing flow
      } finally {
        setBusy(false);
      }
    },
    [busy, close],
  );

  const saveLink = useCallback(async () => {
    const url = linkDraft.trim();
    if (!url || busy) {
      return;
    }
    setBusy(true);
    try {
      await ingestPastedLinks(url);
      close();
    } finally {
      setBusy(false);
    }
  }, [busy, close, linkDraft]);

  const saveMemo = useCallback(async () => {
    const text = memoDraft.trim();
    if (!text || busy) {
      return;
    }
    setBusy(true);
    try {
      await ingestPastedLinks(text);
      close();
    } finally {
      setBusy(false);
    }
  }, [busy, close, memoDraft]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void onPhotoSelected(file);
          event.target.value = "";
        }}
      />
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="닫기"
              className="fixed inset-0 z-[88] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-label="기록하기"
              className="fixed inset-x-0 bottom-0 z-[89] mx-auto w-full max-w-lg overflow-hidden rounded-t-[24px] border border-border bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              data-capture-sheet
            >
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-foreground/15" aria-hidden />
              <header className="flex items-center justify-between px-5 pb-2 pt-4">
                <p className="text-[17px] font-semibold text-foreground">기록하기</p>
                <button
                  type="button"
                  onClick={close}
                  className="flex size-9 items-center justify-center rounded-full active:bg-foreground/5"
                  aria-label="닫기"
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </header>

              {mode === "tiles" ? (
                <div className="grid grid-cols-2 gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  {TILES.map((tile) => {
                    const Icon = tile.icon;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        disabled={!tile.enabled || busy}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-8",
                          "text-[14px] font-semibold text-foreground transition-opacity",
                          tile.enabled ? "active:opacity-70" : "opacity-35",
                        )}
                        onClick={() => {
                          if (!tile.enabled) {
                            return;
                          }
                          if (tile.id === "photo") {
                            photoInputRef.current?.click();
                            return;
                          }
                          if (tile.id === "link") {
                            setMode("link");
                            return;
                          }
                          if (tile.id === "memo") {
                            setMode("memo");
                          }
                        }}
                      >
                        <Icon className="size-7 text-foreground/80" aria-hidden />
                        {tile.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {mode === "link" ? (
                <div className="space-y-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="링크 붙여넣기"
                    value={linkDraft}
                    onChange={(event) => setLinkDraft(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                  <button
                    type="button"
                    disabled={!linkDraft.trim() || busy}
                    onClick={() => void saveLink()}
                    className="w-full rounded-2xl bg-foreground py-4 text-[16px] font-semibold text-background disabled:opacity-40"
                  >
                    저장
                  </button>
                </div>
              ) : null}

              {mode === "memo" ? (
                <div className="space-y-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <textarea
                    rows={4}
                    placeholder="메모"
                    value={memoDraft}
                    onChange={(event) => setMemoDraft(event.target.value)}
                    className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                  <button
                    type="button"
                    disabled={!memoDraft.trim() || busy}
                    onClick={() => void saveMemo()}
                    className="w-full rounded-2xl bg-foreground py-4 text-[16px] font-semibold text-background disabled:opacity-40"
                  >
                    저장
                  </button>
                </div>
              ) : null}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}
