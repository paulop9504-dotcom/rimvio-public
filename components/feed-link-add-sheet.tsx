"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ImageUp, Link2, Loader2, X } from "lucide-react";
import { InboxLinkInput } from "@/components/inbox-link-input";
import { useCopy } from "@/hooks/use-copy";
import type { CaptureIntent } from "@/lib/capture/capture-intent-types";
import type { InboxPasteResult } from "@/lib/share/inbox-paste";
import {
  commitConfirmedScreenshot,
  ingestScreenshot,
  isScreenshotConfirmError,
  type ScreenshotConfirmPayload,
} from "@/lib/share/ingest-screenshot";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FeedLinkAddSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (result: InboxPasteResult) => void;
  onPaymentDetected?: (intent: CaptureIntent) => void;
  onLocateImage?: (file: File) => void;
  requestClipboard?: boolean;
};

export function FeedLinkAddSheet({
  open,
  onOpenChange,
  onSaved,
  onPaymentDetected,
  onLocateImage,
  requestClipboard = false,
}: FeedLinkAddSheetProps) {
  const copy = useCopy();
  const clipboardRequestedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [screenshotBusy, setScreenshotBusy] = useState(false);
  const [screenshotProgress, setScreenshotProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmPayload, setConfirmPayload] = useState<ScreenshotConfirmPayload | null>(
    null
  );

  useEffect(() => {
    if (open) {
      return;
    }

    clipboardRequestedRef.current = false;
    setScreenshotBusy(false);
    setScreenshotProgress(0);
    setConfirmPayload(null);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, [open]);

  const handleScreenshotPick = async (file: File | null) => {
    if (!file || screenshotBusy) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(copy.feed.screenshotInvalid);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    setScreenshotBusy(true);
    setScreenshotProgress(0);

    try {
      const result = await ingestScreenshot(file, (progress) => {
        setScreenshotProgress(progress.progress);
      });
      toast.success(copy.feed.captureIntentFound);
      onSaved?.(result);
      onLocateImage?.(file);
      onOpenChange(false);
    } catch (error) {
      if (isScreenshotConfirmError(error)) {
        setConfirmPayload(error.payload);
        return;
      }

      const message =
        error instanceof Error && error.message === "screenshot_no_intent"
          ? copy.feed.screenshotNoIntent
          : copy.feed.screenshotFailed;
      toast.error(message);
    } finally {
      setScreenshotBusy(false);
    }
  };

  const handleConfirmScreenshot = async () => {
    if (!confirmPayload || screenshotBusy) {
      return;
    }

    setScreenshotBusy(true);
    try {
      const result = await commitConfirmedScreenshot(confirmPayload, (progress) => {
        setScreenshotProgress(progress.progress);
      });
      toast.success(copy.feed.captureIntentFound);
      onSaved?.(result);
      onLocateImage?.(confirmPayload.file);
      onPaymentDetected?.(confirmPayload.intent);
      onOpenChange(false);
    } catch {
      toast.error(copy.feed.screenshotFailed);
    } finally {
      setScreenshotBusy(false);
      setConfirmPayload(null);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={copy.common.close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feed-link-add-title"
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-md",
              "rounded-t-[2rem] pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              "bg-gradient-to-b from-background via-background to-muted/30",
              "shadow-[0_-28px_80px_-24px_rgba(0,0,0,0.45)] ring-1 ring-border/30"
            )}
          >
            <div className="relative mx-auto mt-2.5 h-1 w-11 rounded-full bg-muted-foreground/20" />

            <div className="relative px-5 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Link2 className="size-3.5" strokeWidth={2.1} />
                    {copy.feed.capturePill}
                  </p>
                  <h2
                    id="feed-link-add-title"
                    className="mt-1 text-lg font-semibold tracking-tight"
                  >
                    {copy.feed.captureSheetTitle}
                  </h2>
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                    {copy.feed.captureSheetHint}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
                  aria-label={copy.common.close}
                >
                  <X className="size-4" strokeWidth={2.25} />
                </button>
              </div>

              <div className="mt-4 space-y-4 pb-1">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    event.target.value = "";
                    void handleScreenshotPick(file);
                  }}
                />

                <button
                  type="button"
                  disabled={screenshotBusy}
                  onClick={() => cameraInputRef.current?.click()}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-[1.1rem]",
                    "bg-gradient-to-r from-[#007AFF] to-[#5856D6] px-4 py-4",
                    "text-[15px] font-semibold text-white shadow-[0_12px_28px_-16px_rgba(0,122,255,0.85)]",
                    "transition-transform active:scale-[0.99] disabled:opacity-70"
                  )}
                >
                  {screenshotBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {copy.feed.screenshotProcessing}
                      {screenshotProgress > 0 ? ` ${screenshotProgress}%` : ""}
                    </>
                  ) : (
                    <>
                      <Camera className="size-4" strokeWidth={2.1} />
                      {copy.feed.captureCamera}
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-muted-foreground">
                  {copy.feed.captureCameraHint}
                </p>

                <InboxLinkInput
                  autoFocusOnMount
                  requestClipboard={
                    requestClipboard && !clipboardRequestedRef.current
                  }
                  onClipboardRequested={() => {
                    clipboardRequestedRef.current = true;
                  }}
                  onSaved={(result) => {
                    onSaved?.(result);
                    onOpenChange(false);
                  }}
                />

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/70" />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {copy.feed.captureOr}
                  </span>
                  <div className="h-px flex-1 bg-border/70" />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    event.target.value = "";
                    void handleScreenshotPick(file);
                  }}
                />

                <button
                  type="button"
                  disabled={screenshotBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-[1.1rem]",
                    "border border-dashed border-[#FF9500]/45 bg-[#FF9500]/[0.06]",
                    "px-4 py-3.5 text-sm font-semibold text-[#C2410C]",
                    "transition-transform active:scale-[0.99] disabled:opacity-70"
                  )}
                >
                  {screenshotBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {copy.feed.screenshotProcessing}
                      {screenshotProgress > 0 ? ` ${screenshotProgress}%` : ""}
                    </>
                  ) : (
                    <>
                      <ImageUp className="size-4" strokeWidth={2.1} />
                      {copy.feed.screenshotPick}
                    </>
                  )}
                </button>

                {previewUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt=""
                      className="max-h-40 w-full object-cover object-top"
                    />
                  </div>
                ) : null}

                {confirmPayload ? (
                  <div className="rounded-2xl border border-[#FF9500]/35 bg-[#FF9500]/[0.07] p-4">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {copy.feed.screenshotConfirmPrompt(confirmPayload.intent.query)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={screenshotBusy}
                        onClick={() => void handleConfirmScreenshot()}
                        className={cn(
                          "flex-1 rounded-xl bg-[#FF9500] px-4 py-2.5 text-sm font-semibold text-white",
                          "transition-transform active:scale-[0.99] disabled:opacity-70"
                        )}
                      >
                        {copy.feed.screenshotConfirmYes}
                      </button>
                      <button
                        type="button"
                        disabled={screenshotBusy}
                        onClick={() => {
                          setConfirmPayload(null);
                          if (previewUrl) {
                            URL.revokeObjectURL(previewUrl);
                          }
                          setPreviewUrl(null);
                        }}
                        className={cn(
                          "rounded-xl border border-border/70 px-4 py-2.5 text-sm font-medium",
                          "text-muted-foreground transition-colors hover:bg-muted/50"
                        )}
                      >
                        {copy.feed.screenshotConfirmRetry}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
